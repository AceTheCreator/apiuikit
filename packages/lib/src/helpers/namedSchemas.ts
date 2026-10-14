const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** JSON Schema keywords whose values are subschemas (or maps/lists of them). */
export const SCHEMA_STRUCTURAL_KEYS = new Set([
  "properties", "items", "allOf", "oneOf", "anyOf", "additionalProperties",
  "patternProperties", "propertyNames", "not", "if", "then", "else",
  "contains", "additionalItems", "prefixItems", "definitions", "$defs",
]);

const STRUCTURAL_KEY_LIST = Array.from(SCHEMA_STRUCTURAL_KEYS);

const COMPONENT_SCHEMA_PREFIX = "#/components/schemas/";

const decodePointerSegment = (segment: string) => segment.replace(/~1/g, "/").replace(/~0/g, "~");

/** The component schema a JSON Pointer is or points inside of (`#/components/schemas/<name>/…`), if any. */
export const componentSchemaContaining = (pointer: string): string | undefined => {
  if (!pointer.startsWith(COMPONENT_SCHEMA_PREFIX)) return undefined;
  const segment = pointer.slice(COMPONENT_SCHEMA_PREFIX.length).split("/")[0];
  return segment ? decodePointerSegment(segment) : undefined;
};

/**
 * Names a document's component schemas wherever they've been inlined, so a
 * walker can stop at one instead of re-expanding it at every reference site.
 * In densely linked specs that re-expansion is what blows up: Stripe's
 * response schemas are ~9k distinct objects but tens of millions of nodes
 * walked as a tree.
 *
 * Matched by identity, two ways: resolveDocument inlines a `$ref` as the
 * target object itself (its `copies`), while @scalar/openapi-parser inlines a
 * fresh shallow copy of the target whose structural children (`properties`,
 * `items`, …) are still the target's own — so a node also matches when one of
 * those children is the same object, under the same key, on a named schema of
 * the same `type`. Where such a copy sits inside its own target, resolveDocument
 * cuts the cycle by replacing that child with a `$ref` stub to wherever the
 * child first appeared — often deep under `#/paths`, not under the schema —
 * so with `deref` (against the same resolved document) a stub child is
 * followed and matched the same way.
 */
export const createNamedSchemaLookup = (
  schemas: Record<string, unknown> | undefined,
  deref?: (ref: string) => unknown,
): ((node: unknown) => string | undefined) => {
  const byObject = new Map<object, string>();
  const byChild = new Map<object, { name: string; schema: Record<string, unknown>; key: string }>();
  for (const [name, schema] of Object.entries(schemas ?? {})) {
    if (!isRecord(schema)) continue;
    if (!byObject.has(schema)) byObject.set(schema, name);
    for (const key of STRUCTURAL_KEY_LIST) {
      const child = schema[key];
      if (typeof child === "object" && child !== null && !byChild.has(child)) {
        byChild.set(child, { name, schema, key });
      }
    }
  }

  return (node) => {
    if (!isRecord(node)) return undefined;
    const direct = byObject.get(node);
    if (direct !== undefined) return direct;
    for (const key of STRUCTURAL_KEY_LIST) {
      let child = node[key];
      if (isRecord(child) && typeof child.$ref === "string" && deref) child = deref(child.$ref);
      if (typeof child !== "object" || child === null) continue;
      const owner = byChild.get(child);
      if (owner && owner.key === key && owner.schema.type === node.type) return owner.name;
    }
    return undefined;
  };
};
