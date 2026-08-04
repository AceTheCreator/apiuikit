import { describe, expect, it } from "vitest";
import {
  isAvroSchemaFormat,
  isMultiFormatSchema,
  isProtobufSchemaFormat,
  looksLikeRawAvro,
  resolveSchemaInput,
  schemaFormatBadge,
  schemaFormatName,
  supportsGeneratedExamples,
} from "../schemaFormat";
import { waitForProtobufConverter } from "../protobuf/lazyProtoToJsonSchema";

const AVRO_FORMAT = "application/vnd.apache.avro;version=1.9.0";
const PROTOBUF_FORMAT = "application/vnd.google.protobuf;version=3";
const RAML_FORMAT = "application/raml+yaml;version=1.0";

const rawProtoSource = `
syntax = "proto3";
message Point {
  int32 lat = 1;
  int32 lon = 2;
}
`;

const rawAvroRecord = {
  type: "record",
  name: "Point",
  fields: [
    { name: "lat", type: "double" },
    { name: "lon", type: "double" },
  ],
};

describe("isAvroSchemaFormat", () => {
  it("matches all registered Avro MIME variants", () => {
    expect(isAvroSchemaFormat("application/vnd.apache.avro")).toBe(true);
    expect(isAvroSchemaFormat("application/vnd.apache.avro+json;version=1.9.0")).toBe(true);
    expect(isAvroSchemaFormat("application/vnd.apache.avro+yaml;version=1.8.2")).toBe(true);
    expect(isAvroSchemaFormat("application/schema+json;version=draft-07")).toBe(false);
    expect(isAvroSchemaFormat(undefined)).toBe(false);
  });
});

describe("isProtobufSchemaFormat", () => {
  it("matches versioned and version-less protobuf MIME types", () => {
    expect(isProtobufSchemaFormat("application/vnd.google.protobuf")).toBe(true);
    expect(isProtobufSchemaFormat("application/vnd.google.protobuf;version=2")).toBe(true);
    expect(isProtobufSchemaFormat(PROTOBUF_FORMAT)).toBe(true);
    expect(isProtobufSchemaFormat("application/vnd.apache.avro")).toBe(false);
    expect(isProtobufSchemaFormat(undefined)).toBe(false);
  });
});

describe("schemaFormatName", () => {
  it("names the formats the lib converts, null otherwise", () => {
    expect(schemaFormatName(AVRO_FORMAT)).toBe("Avro");
    expect(schemaFormatName(PROTOBUF_FORMAT)).toBe("Protobuf");
    expect(schemaFormatName(RAML_FORMAT)).toBeNull();
    expect(schemaFormatName(undefined)).toBeNull();
  });
});

describe("schemaFormatBadge", () => {
  it("shortens Avro MIME types", () => {
    expect(schemaFormatBadge(AVRO_FORMAT)).toBe("avro 1.9.0");
    expect(schemaFormatBadge("application/vnd.apache.avro")).toBe("avro");
  });

  it("shortens protobuf MIME types", () => {
    expect(schemaFormatBadge(PROTOBUF_FORMAT)).toBe("protobuf 3");
    expect(schemaFormatBadge("application/vnd.google.protobuf")).toBe("protobuf");
  });

  it("hides default AsyncAPI and JSON Schema formats", () => {
    expect(schemaFormatBadge("application/vnd.aai.asyncapi;version=3.0.0")).toBeNull();
    expect(schemaFormatBadge("application/schema+json;version=draft-07")).toBeNull();
    expect(schemaFormatBadge(undefined)).toBeNull();
  });
});

describe("looksLikeRawAvro", () => {
  it("treats strings, unions, and Avro-typed objects as raw", () => {
    expect(looksLikeRawAvro("com.example.Point")).toBe(true);
    expect(looksLikeRawAvro(["null", "string"])).toBe(true);
    expect(looksLikeRawAvro(rawAvroRecord)).toBe(true);
    expect(looksLikeRawAvro({ type: "fixed", name: "MD5", size: 16 })).toBe(true);
  });

  it("recognizes converted JSON Schema by its markers", () => {
    expect(
      looksLikeRawAvro({ type: "object", properties: { lat: { type: "number" } } }),
    ).toBe(false);
    expect(looksLikeRawAvro({ oneOf: [{ type: "string" }] })).toBe(false);
  });
});

describe("resolveSchemaInput", () => {
  it("returns plain schemas unchanged", () => {
    const schema = { type: "object", properties: {} };
    expect(resolveSchemaInput(schema)).toEqual({ schema });
  });

  it("converts a multi-format wrapper holding raw Avro", () => {
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: rawAvroRecord,
    });

    expect(result.schemaFormat).toBe(AVRO_FORMAT);
    expect(result.originalSchema).toBe(rawAvroRecord);
    expect(result.conversionError).toBeUndefined();
    expect(result.schema.type).toBe("object");
    expect(Object.keys(result.schema.properties ?? {})).toEqual(["lat", "lon"]);
    expect(result.schema.required).toEqual(["lat", "lon"]);
  });

  it("passes through a wrapper already converted by @asyncapi/parser", () => {
    const converted = { type: "object", properties: { lat: { type: "number" } } };
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: converted,
      "x-parser-original-payload": rawAvroRecord,
    });

    expect(result.schema).toBe(converted);
    expect(result.originalSchema).toBe(rawAvroRecord);
    expect(result.conversionError).toBeUndefined();
  });

  it("unwraps non-Avro formats without converting", () => {
    const schema = { type: "object" };
    const result = resolveSchemaInput({
      schemaFormat: "application/schema+json;version=draft-07",
      schema,
    });

    expect(result.schema).toBe(schema);
    expect(result.originalSchema).toBeUndefined();
  });

  it("fails soft on malformed Avro without throwing", () => {
    const malformed = { type: "record", name: "Broken" }; // record without fields
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: malformed,
    });

    expect(result.schema).toBe(malformed);
    expect(result.originalSchema).toBe(malformed);
    expect(result.conversionError).toContain("fields");
  });

  it("converts a multi-format wrapper holding raw protobuf source", async () => {
    // Protobuf conversion is lazy-loaded (see lazyProtoToJsonSchema.ts) —
    // wait for it so this asserts on the real conversion, not the pending
    // placeholder resolveSchemaInput returns before it's ready.
    await waitForProtobufConverter();
    const result = resolveSchemaInput({
      schemaFormat: PROTOBUF_FORMAT,
      schema: rawProtoSource,
    });

    expect(result.schemaFormat).toBe(PROTOBUF_FORMAT);
    expect(result.originalSchema).toBe(rawProtoSource);
    expect(result.conversionError).toBeUndefined();
    expect(result.schema.type).toBe("object");
    expect(Object.keys(result.schema.properties ?? {})).toEqual(["lat", "lon"]);
    expect(result.schema.required).toEqual(["lat", "lon"]);
  });

  it("fails soft on invalid protobuf source without throwing", async () => {
    await waitForProtobufConverter();
    const broken = "message Broken {"; // unterminated block
    const result = resolveSchemaInput({
      schemaFormat: PROTOBUF_FORMAT,
      schema: broken,
    });

    expect(result.schema).toEqual({});
    expect(result.originalSchema).toBe(broken);
    expect(result.conversionError).toBeTruthy();
  });

  it("passes through a protobuf wrapper already converted by @asyncapi/parser", () => {
    const converted = { type: "object", properties: { lat: { type: "integer" } } };
    const result = resolveSchemaInput({
      schemaFormat: PROTOBUF_FORMAT,
      schema: converted,
      "x-parser-original-payload": rawProtoSource,
    });

    expect(result.schema).toBe(converted);
    expect(result.originalSchema).toBe(rawProtoSource);
    expect(result.conversionError).toBeUndefined();
  });

  it("resolves a top-level $ref before converting multi-format protobuf", async () => {
    await waitForProtobufConverter();
    const components: Record<string, unknown> = {
      pointPayload: { schemaFormat: PROTOBUF_FORMAT, schema: rawProtoSource },
    };
    const deref = (ref: string) => components[ref.split("/").pop()!];

    const result = resolveSchemaInput(
      { $ref: "#/components/schemas/pointPayload" },
      deref,
    );

    expect(result.schemaFormat).toBe(PROTOBUF_FORMAT);
    expect(Object.keys(result.schema.properties ?? {})).toEqual(["lat", "lon"]);
  });

  it("preserves string-bodied unconverted formats (RAML) for the JSON tab", () => {
    const raml = "#%RAML 1.0 DataType\ntype: object";
    const result = resolveSchemaInput({
      schemaFormat: RAML_FORMAT,
      schema: raml,
    });

    expect(result.schema).toEqual({});
    expect(result.originalSchema).toBe(raml);
    expect(result.schemaFormat).toBe(RAML_FORMAT);
    expect(result.conversionError).toBeUndefined();
  });

  it("preserves invalid Avro string bodies alongside conversionError", () => {
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: "not a valid type!!!",
    });

    expect(result.conversionError).toContain("not a valid type");
    expect(result.originalSchema).toBe("not a valid type!!!");
  });

  it("resolves a top-level $ref before converting multi-format Avro", () => {
    const components = {
      lightMeasuredPayload: {
        schemaFormat: AVRO_FORMAT,
        schema: rawAvroRecord,
      },
    };
    const deref = (ref: string) => {
      const name = ref.split("/").pop()!;
      return (components as Record<string, unknown>)[name];
    };

    const result = resolveSchemaInput(
      { $ref: "#/components/schemas/lightMeasuredPayload" },
      deref,
    );

    expect(result.schemaFormat).toBe(AVRO_FORMAT);
    expect(result.schema.type).toBe("object");
    expect(Object.keys(result.schema.properties ?? {})).toEqual(["lat", "lon"]);
  });

  it("surfaces the with-parser conversion-error marker", () => {
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: { "x-lib-conversion-error": "boom" },
      "x-parser-original-payload": rawAvroRecord,
    });

    expect(result.conversionError).toBe("boom");
    expect(result.schema).toBe(rawAvroRecord);
  });

  it("surfaces the resolved schema's own description", () => {
    const schema = { type: "object", description: "from the schema" };
    expect(resolveSchemaInput(schema).description).toBe("from the schema");
  });

  it("falls back to a description carried on the wrapper", () => {
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: rawAvroRecord,
      description: "from the wrapper",
    });

    expect(result.description).toBe("from the wrapper");
  });

  it("prefers the converted schema's description (Avro doc) over the wrapper's", () => {
    const result = resolveSchemaInput({
      schemaFormat: AVRO_FORMAT,
      schema: { ...rawAvroRecord, doc: "from the Avro doc" },
      description: "from the wrapper",
    });

    expect(result.description).toBe("from the Avro doc");
  });

  it("tolerates boolean inner schemas", () => {
    const result = resolveSchemaInput({
      schemaFormat: "application/schema+json;version=draft-07",
      schema: true,
    });

    expect(result.schema).toEqual({});
  });
});

describe("isMultiFormatSchema", () => {
  it("requires an object with string schemaFormat and a schema key", () => {
    expect(isMultiFormatSchema({ schemaFormat: AVRO_FORMAT, schema: {} })).toBe(true);
    expect(isMultiFormatSchema({ schemaFormat: AVRO_FORMAT })).toBe(false);
    expect(isMultiFormatSchema({ schema: {} })).toBe(false);
    expect(isMultiFormatSchema(null)).toBe(false);
  });
});

describe("supportsGeneratedExamples", () => {
  it("allows default JSON Schema, Avro, and Protobuf; hides other multi-formats", () => {
    expect(supportsGeneratedExamples(undefined)).toBe(true);
    expect(supportsGeneratedExamples(AVRO_FORMAT)).toBe(true);
    expect(supportsGeneratedExamples(PROTOBUF_FORMAT)).toBe(true);
    expect(supportsGeneratedExamples("application/schema+json;version=draft-07")).toBe(true);
    expect(supportsGeneratedExamples(RAML_FORMAT)).toBe(false);
  });

  it("hides examples when conversion failed", () => {
    expect(supportsGeneratedExamples(AVRO_FORMAT, "boom")).toBe(false);
  });
});
