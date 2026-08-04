/**
 * schemaFormat handling shared by both rendering modes.
 *
 * AsyncAPI v3 wraps non-default-format schemas in a multi-format object
 * `{ schemaFormat, schema }`. @asyncapi/parser converts the inner schema in
 * place but leaves the wrapper intact (storing the source under
 * "x-parser-original-payload"), and in without-parser mode no conversion has
 * happened at all — so every schema entering the renderer passes through
 * resolveSchemaInput to unwrap and, for Avro and Protobuf, convert.
 */
import { asSchemaNode, isSchemaRecord, SchemaNodeData } from "../types/schema";
import { avroToJsonSchema, validateAvroStructure, AvroSchema } from "./avro";
import { getProtoToJsonSchema } from "./protobuf/lazyProtoToJsonSchema";

export const X_PARSER_ORIGINAL_PAYLOAD = "x-parser-original-payload";
/** Marker set by the with-parser fail-soft path when conversion throws. */
export const X_LIB_CONVERSION_ERROR = "x-lib-conversion-error";

/** The MIME strings @asyncapi/avro-schema-parser registers, which parser-js
 * matches exactly, plus version-less variants accepted in without-parser mode. */
const AVRO_SCHEMA_FORMAT_PATTERN =
  /^application\/vnd\.apache\.avro(\+(json|yaml))?(\s*;\s*version=.+)?$/i;

/** The MIME strings @asyncapi/protobuf-schema-parser registers (versions 2
 * and 3), relaxed to any version plus a version-less variant. */
const PROTOBUF_SCHEMA_FORMAT_PATTERN =
  /^application\/vnd\.google\.protobuf(\s*;\s*version=.+)?$/i;

export interface ResolvedSchemaInput {
  /** The JSON-Schema-shaped object SchemaTree/Examples should render. */
  schema: SchemaNodeData;
  /** The declared schemaFormat, when the input was a multi-format wrapper. */
  schemaFormat?: string;
  /** The source schema (e.g. raw Avro), when a conversion happened. */
  originalSchema?: unknown;
  /** Set when an Avro/Protobuf format was declared but conversion failed;
   * `schema` falls back to the raw definition (or `{}` when the raw input is
   * not object-shaped, e.g. protobuf source text). */
  conversionError?: string;
  /** Description to display: the resolved schema's own `description`, falling
   * back to one carried on the multi-format wrapper (not spec-defined there,
   * but tolerated — the parser passes it through untouched). */
  description?: string;
  /** True while a Protobuf schema's converter is still being lazy-loaded —
   * `schema` is a placeholder until then. See lazyProtoToJsonSchema.ts. */
  pendingConversion?: boolean;
}

export function isAvroSchemaFormat(format: unknown): boolean {
  return typeof format === "string" && AVRO_SCHEMA_FORMAT_PATTERN.test(format);
}

export function isProtobufSchemaFormat(format: unknown): boolean {
  return (
    typeof format === "string" && PROTOBUF_SCHEMA_FORMAT_PATTERN.test(format)
  );
}

export function isMultiFormatSchema(
  value: unknown,
): value is { schemaFormat: string; schema: unknown } & Record<string, unknown> {
  return (
    isSchemaRecord(value) &&
    typeof value.schemaFormat === "string" &&
    "schema" in value
  );
}

/** Short badge text for a declared schemaFormat, e.g. "avro 1.9.0"; null for
 * the default AsyncAPI / JSON Schema formats that need no callout. */
export function schemaFormatBadge(format: unknown): string | null {
  if (typeof format !== "string") return null;
  if (isAvroSchemaFormat(format)) {
    const version = /;\s*version=([^;\s]+)/.exec(format)?.[1];
    return version ? `avro ${version}` : "avro";
  }
  if (isProtobufSchemaFormat(format)) {
    const version = /;\s*version=([^;\s]+)/.exec(format)?.[1];
    return version ? `protobuf ${version}` : "protobuf";
  }
  if (
    format.startsWith("application/vnd.aai.asyncapi") ||
    format.startsWith("application/schema")
  ) {
    return null;
  }
  return format;
}

/** Human-readable name for a declared schemaFormat, used in messages like
 * "Could not convert Avro schema"; null when the format has no short name
 * (callers phrase around it, e.g. "Could not convert the schema"). */
export function schemaFormatName(format: unknown): string | null {
  if (isAvroSchemaFormat(format)) return "Avro";
  if (isProtobufSchemaFormat(format)) return "Protobuf";
  return null;
}

/** Whether the Example tab can safely generate samples via json-schema-faker.
 * Formats the lib converts (Avro, Protobuf) qualify; other non-JSON-Schema
 * multi-format bodies (RAML, …) are excluded. */
export function supportsGeneratedExamples(
  schemaFormat?: string,
  conversionError?: string,
): boolean {
  if (conversionError) return false;
  if (!schemaFormat) return true;
  if (isAvroSchemaFormat(schemaFormat)) return true;
  if (isProtobufSchemaFormat(schemaFormat)) return true;
  return (
    schemaFormat.startsWith("application/vnd.aai.asyncapi") ||
    schemaFormat.startsWith("application/schema")
  );
}

const JSON_SCHEMA_MARKERS = [
  "properties",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "$ref",
  "additionalProperties",
  "patternProperties",
  "x-parser-schema-id",
];

/** Avro type names that never appear as a JSON Schema `type`. */
const AVRO_ONLY_TYPES = new Set([
  "record",
  "enum",
  "fixed",
  "map",
  "int",
  "long",
  "float",
  "double",
  "bytes",
  "uuid",
]);

/**
 * Discriminates a raw Avro definition from an already-converted JSON Schema,
 * for the case where a document declares an Avro schemaFormat but the schema
 * may have been converted upstream. Ambiguous leaves (e.g. {type:"string"})
 * count as raw — converting them is harmless.
 */
export function looksLikeRawAvro(value: unknown): boolean {
  if (typeof value === "string") return true; // primitive or named reference
  if (Array.isArray(value)) return true; // union
  if (!isSchemaRecord(value)) return false;

  if (typeof value.type === "string" && AVRO_ONLY_TYPES.has(value.type)) {
    return true;
  }
  if (Array.isArray(value.fields) || Array.isArray(value.symbols)) return true;
  return !JSON_SCHEMA_MARKERS.some((marker) => marker in value);
}

/**
 * Normalizes any payload/headers/components.schemas entry for rendering:
 * unwraps v3 multi-format wrappers and converts raw Avro to JSON Schema when
 * an Avro schemaFormat is declared. Never throws.
 *
 * When `deref` is provided, a top-level `$ref` is resolved first so multi-format
 * Avro wrappers behind a ref still convert (and surface format/error metadata).
 */
export function resolveSchemaInput(
  input: unknown,
  deref?: (ref: string) => unknown,
): ResolvedSchemaInput {
  let current = input;
  if (
    deref &&
    isSchemaRecord(current) &&
    typeof current.$ref === "string"
  ) {
    const resolved = deref(current.$ref);
    if (resolved !== undefined) current = resolved;
  }

  const resolved = unwrapSchemaInput(current);

  const ownDescription = resolved.schema.description;
  if (typeof ownDescription === "string") {
    return { ...resolved, description: ownDescription };
  }
  const wrapperDescription = isMultiFormatSchema(current)
    ? current.description
    : undefined;
  if (typeof wrapperDescription === "string") {
    return { ...resolved, description: wrapperDescription };
  }
  return resolved;
}

function unwrapSchemaInput(input: unknown): ResolvedSchemaInput {
  if (!isMultiFormatSchema(input)) {
    return { schema: (asSchemaNode(input) ?? input) as SchemaNodeData };
  }

  const { schemaFormat } = input;
  const inner = input.schema;
  const original = input[X_PARSER_ORIGINAL_PAYLOAD];

  // The with-parser fail-soft marker: conversion already failed during parse.
  const parseError = asSchemaNode(inner)?.[X_LIB_CONVERSION_ERROR];
  if (typeof parseError === "string") {
    return {
      schema: asSchemaNode(original) ?? {},
      schemaFormat,
      originalSchema: original,
      conversionError: parseError,
    };
  }

  if (original !== undefined) {
    // @asyncapi/parser already converted the inner schema.
    return {
      schema: asSchemaNode(inner) ?? {},
      schemaFormat,
      originalSchema: original,
    };
  }

  if (isAvroSchemaFormat(schemaFormat) && looksLikeRawAvro(inner)) {
    const problems = validateAvroStructure(inner);
    if (problems.length > 0) {
      return {
        schema: asSchemaNode(inner) ?? {},
        schemaFormat,
        originalSchema: inner,
        conversionError: problems[0],
      };
    }
    try {
      return {
        schema: avroToJsonSchema(inner as AvroSchema),
        schemaFormat,
        originalSchema: inner,
      };
    } catch (err) {
      return {
        schema: asSchemaNode(inner) ?? {},
        schemaFormat,
        originalSchema: inner,
        conversionError:
          err instanceof Error ? err.message : "Failed to convert Avro schema",
      };
    }
  }

  if (isProtobufSchemaFormat(schemaFormat) && typeof inner === "string") {
    // Raw protobuf arrives as `.proto` source text (a YAML block scalar or
    // JSON string) — the string check is the whole raw-vs-converted
    // discriminator. Already-converted objects with the format still declared
    // fall through to the passthrough below, matching the with-parser
    // `original !== undefined` branch. No pre-validation here (unlike Avro):
    // validateProtobufStructure compiles, so it would just compile twice.
    const protoToJsonSchema = getProtoToJsonSchema();
    if (!protoToJsonSchema) {
      // First Protobuf schema encountered this session — the converter
      // (protobufjs) is loading in the background. Callers should include
      // useProtobufConverterReady() in their memo deps to re-resolve once
      // it's ready, same as any other format from then on.
      return {
        schema: {},
        schemaFormat,
        originalSchema: inner,
        pendingConversion: true,
      };
    }
    try {
      return {
        schema: protoToJsonSchema(inner),
        schemaFormat,
        originalSchema: inner,
      };
    } catch (err) {
      return {
        // Raw proto text is not tree-renderable; the JSON tab shows
        // originalSchema instead.
        schema: {},
        schemaFormat,
        originalSchema: inner,
        conversionError:
          err instanceof Error
            ? err.message
            : "Failed to convert Protobuf schema",
      };
    }
  }

  // Other multi-format (or Avro/Protobuf that is already JSON-Schema-shaped).
  // Preserve non-object bodies (e.g. RAML source text) for the JSON tab.
  const schemaNode = asSchemaNode(inner);
  if (schemaNode) {
    return { schema: schemaNode, schemaFormat };
  }
  return { schema: {}, schemaFormat, originalSchema: inner };
}
