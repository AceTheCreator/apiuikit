import { describe, expect, it } from "vitest";
import { resolveDocument } from "../resolveDocument";

describe("resolveDocument", () => {
  it("inlines internal $refs and stamps the schema name", () => {
    const doc = {
      channels: {
        light: { payload: { $ref: "#/components/schemas/point" } },
      },
      components: {
        schemas: {
          point: { type: "object", properties: { lat: { type: "number" } } },
        },
      },
    };

    const resolved = resolveDocument(doc) as typeof doc;
    const payload = resolved.channels.light.payload as Record<string, unknown>;

    expect(payload.$ref).toBeUndefined();
    expect(payload.type).toBe("object");
    expect(payload["x-parser-schema-id"]).toBe("point");
  });

  it("never mutates the input document", () => {
    const doc = {
      channels: { light: { payload: { $ref: "#/components/schemas/point" } } },
      components: { schemas: { point: { type: "object" } } },
    };
    const snapshot = JSON.parse(JSON.stringify(doc));

    resolveDocument(doc);

    expect(doc).toEqual(snapshot);
  });

  it("resolves two references to the same target as the same object", () => {
    const doc = {
      a: { $ref: "#/shared" },
      b: { $ref: "#/shared" },
      shared: { type: "string" },
    };

    const resolved = resolveDocument(doc) as Record<string, unknown>;

    expect(resolved.a).toBe(resolved.b);
    expect(resolved.a).toBe(resolved.shared);
  });

  it("keeps an existing x-parser-schema-id instead of overwriting it", () => {
    const doc = {
      a: { $ref: "#/components/schemas/alias" },
      components: {
        schemas: { alias: { type: "string", "x-parser-schema-id": "original" } },
      },
    };

    const resolved = resolveDocument(doc) as typeof doc;
    expect((resolved.a as Record<string, unknown>)["x-parser-schema-id"]).toBe(
      "original",
    );
  });

  it("leaves cycle-forming refs as $ref nodes so the output stays acyclic", () => {
    const doc = {
      components: {
        schemas: {
          tree: {
            type: "object",
            properties: {
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/tree" },
              },
            },
          },
        },
      },
    };

    const resolved = resolveDocument(doc) as typeof doc;
    const tree = resolved.components.schemas.tree as {
      properties: { children: { items: Record<string, unknown> } };
    };

    expect(tree.properties.children.items.$ref).toBe(
      "#/components/schemas/tree",
    );
    // Acyclic output must JSON.stringify without throwing.
    expect(() => JSON.stringify(resolved)).not.toThrow();
  });

  it("resolves the same schema normally when referenced outside its own cycle", () => {
    const doc = {
      payload: { $ref: "#/components/schemas/tree" },
      components: {
        schemas: {
          tree: {
            type: "object",
            properties: {
              child: { $ref: "#/components/schemas/tree" },
            },
          },
        },
      },
    };

    const resolved = resolveDocument(doc) as typeof doc;
    const payload = resolved.payload as unknown as {
      type?: string;
      properties: { child: Record<string, unknown> };
    };

    // The outer reference inlines; only the self-reference stays a $ref.
    expect(payload.type).toBe("object");
    expect(payload.properties.child.$ref).toBe("#/components/schemas/tree");
    expect(() => JSON.stringify(resolved)).not.toThrow();
  });

  it("decodes JSON Pointer escapes (~0, ~1) in ref paths", () => {
    const doc = {
      a: { $ref: "#/paths/~1users~1{id}" },
      paths: { "/users/{id}": { type: "object" } },
    };

    const resolved = resolveDocument(doc) as Record<string, unknown>;
    expect((resolved.a as Record<string, unknown>).type).toBe("object");
  });

  it("keeps unresolvable and external refs as-is", () => {
    const doc = {
      missing: { $ref: "#/nowhere" },
      external: { $ref: "https://example.com/schema.json" },
    };

    const resolved = resolveDocument(doc) as typeof doc;
    expect((resolved.missing as Record<string, unknown>).$ref).toBe("#/nowhere");
    expect((resolved.external as Record<string, unknown>).$ref).toBe(
      "https://example.com/schema.json",
    );
  });

  it("returns ref-free documents untouched, identity included", () => {
    const doc = {
      info: { title: "No refs here" },
      components: { schemas: { point: { type: "object" } } },
    };

    expect(resolveDocument(doc)).toBe(doc);
  });

  it("re-refs real object cycles (parser output shape) into $ref nodes", () => {
    const schema: Record<string, unknown> = { type: "object" };
    schema.properties = { self: schema };
    const doc = { components: { schemas: { schema } } };

    const resolved = resolveDocument(doc) as {
      components: { schemas: { schema: { properties: { self: unknown } } } };
    };

    expect(resolved).not.toBe(doc);
    expect(resolved.components.schemas.schema.properties.self).toEqual({
      $ref: "#/components/schemas/schema",
    });
    expect(() => JSON.stringify(resolved)).not.toThrow();
    // The input keeps its cycle: never mutated.
    expect((doc.components.schemas.schema.properties as { self: unknown }).self).toBe(schema);
  });

  it("cuts cycles reached through arrays too", () => {
    const node: Record<string, unknown> = { type: "object" };
    node.children = [node];
    const doc = { schema: node };

    const resolved = resolveDocument(doc) as { schema: { children: unknown[] } };

    expect(resolved.schema.children[0]).toEqual({ $ref: "#/schema" });
    expect(() => JSON.stringify(resolved)).not.toThrow();
  });

  it("escapes / and ~ in generated cycle pointers so deref can walk them back", () => {
    const node: Record<string, unknown> = { type: "object" };
    node.self = node;
    const doc = { paths: { "/users/{id}": { schema: node } } };

    const resolved = resolveDocument(doc) as {
      paths: { "/users/{id}": { schema: { self: { $ref: string } } } };
    };

    expect(resolved.paths["/users/{id}"].schema.self.$ref).toBe(
      "#/paths/~1users~1{id}/schema",
    );
  });

  it("keeps acyclic shared subtrees shared instead of re-refing them", () => {
    const shared: Record<string, unknown> = { type: "string" };
    // A cycle elsewhere forces the normalizing walk to run at all.
    const cyclic: Record<string, unknown> = { type: "object" };
    cyclic.self = cyclic;
    const doc = { a: shared, b: shared, cyclic };

    const resolved = resolveDocument(doc) as Record<string, unknown>;

    // Diamonds (shared but acyclic) stay one shared copy, not a $ref.
    expect(resolved.a).toBe(resolved.b);
    expect((resolved.a as Record<string, unknown>).type).toBe("string");
  });
});
