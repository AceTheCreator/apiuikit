import { describe, expect, it } from "vitest";
import { extendExampleSchema, JsonSchema } from "../exampleSchema";

/** Pointer-walking deref against a fixture document, mirroring the runtime one. */
const makeDeref = (doc: Record<string, unknown>) => (refPath: string): unknown => {
  const parts = refPath.replace(/^#\//, "").split("/").filter(Boolean);
  let current: unknown = doc;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
    current = (current as Record<string, unknown>)[decoded];
    if (current == null) return undefined;
  }
  return current;
};

describe("extendExampleSchema", () => {
  it("unrolls a recursive $ref one level, then cuts the second occurrence", () => {
    const doc = {
      components: {
        schemas: {
          node: {
            type: "object",
            properties: {
              message: { type: "string", format: "email" },
              previous: { $ref: "#/components/schemas/node" },
            },
          },
        },
      },
    };
    const node = doc.components.schemas.node as JsonSchema;

    const result = extendExampleSchema(node, makeDeref(doc));

    // First occurrence: the ref inlines to the real node shape.
    const unrolled = (result.properties as Record<string, JsonSchema>).previous;
    expect(unrolled.type).toBe("object");
    expect((unrolled.properties as Record<string, JsonSchema>).message).toMatchObject({
      type: "string",
    });
    // Second occurrence inside the expansion: cut to a terminal placeholder.
    expect((unrolled.properties as Record<string, JsonSchema>).previous).toEqual({});
  });

  it("cuts to { type: 'null' } when the recursive target allows null", () => {
    const doc = {
      components: {
        schemas: {
          node: {
            type: ["object", "null"],
            properties: {
              previous: { $ref: "#/components/schemas/node" },
            },
          },
        },
      },
    };
    const node = doc.components.schemas.node as JsonSchema;

    const result = extendExampleSchema(node, makeDeref(doc));
    const unrolled = (result.properties as Record<string, JsonSchema>).previous;

    expect((unrolled.properties as Record<string, JsonSchema>).previous).toEqual({ type: "null" });
  });

  it("replaces unresolvable $refs with an empty permissive schema", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { broken: { $ref: "#/components/schemas/missing" } },
    };

    const result = extendExampleSchema(schema, () => undefined);

    expect((result.properties as Record<string, JsonSchema>).broken).toEqual({});
  });

  it("unrolls refs reached through array items", () => {
    const doc = {
      components: {
        schemas: {
          node: {
            type: "object",
            properties: {
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/node" },
              },
            },
          },
        },
      },
    };
    const node = doc.components.schemas.node as JsonSchema;

    const result = extendExampleSchema(node, makeDeref(doc));
    const items = ((result.properties as Record<string, JsonSchema>).children.items) as JsonSchema;

    // One unrolled level, then the nested occurrence cuts.
    expect(items.type).toBe("object");
    const nestedItems = ((items.properties as Record<string, JsonSchema>).children.items) as JsonSchema;
    expect(nestedItems).toEqual({});
  });

  it("collapses oneOf/anyOf to the first branch, matching SchemaTree's default case", () => {
    const schema: JsonSchema = {
      oneOf: [
        { type: "object", properties: { kind: { const: "a" } } },
        { type: "object", properties: { kind: { const: "b" } } },
      ],
    };

    const result = extendExampleSchema(schema);

    expect(result.oneOf).toBeUndefined();
    expect((result.properties as Record<string, JsonSchema>).kind).toMatchObject({ const: "a" });
  });

  it("terminates on contract-violating input with real object cycles", () => {
    const schema: JsonSchema = { type: "object" };
    schema.properties = { self: schema };

    const result = extendExampleSchema(schema);

    expect((result.properties as Record<string, JsonSchema>).self).toEqual({});
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("gives id-suffixed string fields a uuid format and plain strings a placeholder", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        userId: { type: "string" },
        name: { type: "string" },
      },
    };

    const result = extendExampleSchema(schema);
    const props = result.properties as Record<string, JsonSchema>;

    expect(props.userId.format).toBe("uuid");
    expect(props.name.examples).toEqual(["string"]);
  });
});
