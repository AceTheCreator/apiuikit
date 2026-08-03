import {useEffect, useState} from "react";
import {generate} from "json-schema-faker";
import { CodeBlock } from "./CodeBlock";

type JsonSchema = Record<string, unknown>;

interface ExamplesProps {
    schema: JsonSchema;
    /** A real example value declared in the spec (OpenAPI media type `example`/`examples`, or an AsyncAPI message example) — shown as-is instead of auto-generating one when present. */
    providedExample?: unknown;
}

function includesType(schema: JsonSchema, type: string): boolean {
    return schema.type === type || (Array.isArray(schema.type) && schema.type.includes(type));
}

function extendExampleSchema(schema: JsonSchema, active = new Set<object>()): JsonSchema {
    // Pre-resolved documents can contain real object cycles (e.g. a
    // self-referencing tree/linked-list schema). Re-entering one here means
    // the schema is still being processed higher up the call stack, so
    // return a terminal placeholder instead of the same cyclic node — handing
    // the original back would let json-schema-faker recurse into it forever
    // and generate() would never resolve.
    if (active.has(schema)) return includesType(schema, "null") ? { type: "null" } : {};

    // oneOf/anyOf branches can each be a completely different shape (e.g. a
    // discriminated union). SchemaTree always defaults to showing case 0, so
    // generate from that same branch instead of an independently-picked one
    // that would otherwise look unrelated to the schema on display.
    if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
        const { oneOf, ...rest } = schema;
        return extendExampleSchema({ ...rest, ...(oneOf[0] as JsonSchema) }, active);
    }
    if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
        const { anyOf, ...rest } = schema;
        return extendExampleSchema({ ...rest, ...(anyOf[0] as JsonSchema) }, active);
    }

    if (includesType(schema, "object") && schema.properties && typeof schema.properties === "object") {
        active.add(schema);
        try {
            const enriched: Record<string, JsonSchema> = {};
            for (const [key, value] of Object.entries(schema.properties as Record<string, JsonSchema>)) {
                const isIdField = /id$/i.test(key) && value.type === "string" && !value.format && !value.examples;
                const isPlainString = value.type === "string" && !value.format && !value.examples && !value.enum;
                enriched[key] = isIdField
                    ? { ...value, format: "uuid" }
                    : isPlainString
                    ? { ...value, examples: ["string"] }
                    : extendExampleSchema(value, active);
            }
            return { ...schema, properties: enriched };
        } finally {
            active.delete(schema);
        }
    }

    if (includesType(schema, "array") && schema.items && typeof schema.items === "object") {
        active.add(schema);
        try {
            return { ...schema, items: extendExampleSchema(schema.items as JsonSchema, active) };
        } finally {
            active.delete(schema);
        }
    }

    return schema;
}

export function Examples ({schema, providedExample}: ExamplesProps) {
    const hasProvidedExample = providedExample !== undefined;
    const [value, setValue] = useState<unknown>(hasProvidedExample ? providedExample : null);

    useEffect(() => {
        if (hasProvidedExample) {
            setValue(providedExample);
            return;
        }

        let cancelled = false;
        // Fail soft: circular or otherwise ungenerable schemas leave the tab
        // empty rather than crashing the render (generate can throw
        // synchronously or reject).
        try {
            generate(extendExampleSchema(schema), { seed: 42, useExamplesValue: true, optionalsProbability: 1 })
                .then((result) => {
                    if (!cancelled) setValue(result);
                })
                .catch(() => undefined);
        } catch {
            // leave value as null
        }
        return () => {
            cancelled = true;
        };
    }, [schema, hasProvidedExample, providedExample]);

    if (value === null) return null;

    const json = JSON.stringify(value, null, 2);

    return (
      <div>
        <CodeBlock code={json} />
        {!hasProvidedExample && (
          <span className="text-xs text-foreground-muted italic mt-2 font-bold inline-block">
            This example is auto generated
          </span>
        )}
      </div>
    );
}
