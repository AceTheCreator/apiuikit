export type JsonSchema = Record<string, unknown>;

export function extendExampleSchema(schema: JsonSchema, active = new Set<object>()): JsonSchema {
  // Pre-resolved documents can contain object cycles — return the node
  // unchanged on re-entry instead of recursing forever.
  if (active.has(schema)) return schema;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
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
  return schema;
}

/**
 * Generates a synthetic example value from a JSON Schema via json-schema-faker.
 * Fails soft: circular or otherwise ungenerable schemas resolve to `undefined`
 * rather than throwing/rejecting, since callers render "no example" instead of
 * crashing.
 */
export async function generateSchemaExample(schema: JsonSchema): Promise<unknown> {
  try {
    const { generate } = await import("json-schema-faker");
    return await generate(extendExampleSchema(schema), {
      seed: 42,
      useExamplesValue: true,
      optionalsProbability: 1,
    });
  } catch {
    return undefined;
  }
}
