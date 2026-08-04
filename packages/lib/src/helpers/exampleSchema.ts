export type JsonSchema = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function includesType(schema: JsonSchema, type: string): boolean {
  return schema.type === type || (Array.isArray(schema.type) && schema.type.includes(type));
}

/**
 * Prepares a schema for json-schema-faker's `generate()` so the Example tab
 * shows something plausible and consistent with the Schema tab:
 *
 * - Leftover `$ref` nodes (resolveDocument's cycle cut-points) are unrolled
 *   exactly one level via `deref`, so a recursive schema's example shows one
 *   real nested occurrence. The second occurrence of the same ref on a path
 *   is cut to `{ type: "null" }` when the target allows null, else `{}`.
 *   Without this, generate() would throw on the unresolvable pointer and the
 *   tab would silently render nothing.
 * - `oneOf`/`anyOf` collapse to their first branch, matching the case
 *   SchemaTree shows by default, instead of letting generate() pick an
 *   unrelated-looking one.
 * - Plain string fields get placeholder examples (and `*id` fields a uuid
 *   format) instead of random character noise.
 */
export function extendExampleSchema(
  schema: JsonSchema,
  deref: (ref: string) => unknown = () => undefined,
  active = new Set<object>(),
  refStack: ReadonlySet<string> = new Set<string>(),
): JsonSchema {
  if (typeof schema.$ref === "string") {
    const ref = schema.$ref;
    const target = deref(ref);
    if (!isRecord(target)) return {}; // unresolvable (or scalar) ref
    if (refStack.has(ref)) {
      // Already unrolled once on this path: terminate the recursion.
      return includesType(target, "null") ? { type: "null" } : {};
    }
    // The target of a cut cycle is usually the very object being walked
    // higher up the call stack (that's what makes it recursive), so the
    // expansion gets a fresh identity set: re-entering it here is the point.
    // Recursion stays bounded because `refStack` cuts the second expansion of
    // the same pointer, and the fresh set still catches real object cycles
    // inside the expansion's own walk.
    return extendExampleSchema(target, deref, new Set(), new Set(refStack).add(ref));
  }

  // Contract-violating input can still contain real object cycles (e.g. a
  // self-referencing tree/linked-list schema). Re-entering one here means
  // the schema is still being processed higher up the call stack, so
  // return a terminal placeholder instead of the same cyclic node: handing
  // the original back would let json-schema-faker recurse into it forever
  // and generate() would never resolve.
  if (active.has(schema)) return includesType(schema, "null") ? { type: "null" } : {};

  // oneOf/anyOf branches can each be a completely different shape (e.g. a
  // discriminated union). SchemaTree always defaults to showing case 0, so
  // generate from that same branch instead of an independently-picked one
  // that would otherwise look unrelated to the schema on display.
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const { oneOf, ...rest } = schema;
    return extendExampleSchema({ ...rest, ...(oneOf[0] as JsonSchema) }, deref, active, refStack);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const { anyOf, ...rest } = schema;
    return extendExampleSchema({ ...rest, ...(anyOf[0] as JsonSchema) }, deref, active, refStack);
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
          : extendExampleSchema(value, deref, active, refStack);
      }
      return { ...schema, properties: enriched };
    } finally {
      active.delete(schema);
    }
  }

  if (includesType(schema, "array") && schema.items && typeof schema.items === "object") {
    active.add(schema);
    try {
      return { ...schema, items: extendExampleSchema(schema.items as JsonSchema, deref, active, refStack) };
    } finally {
      active.delete(schema);
    }
  }

  return schema;
}
