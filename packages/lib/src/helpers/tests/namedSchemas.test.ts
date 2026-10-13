import { describe, expect, it } from "vitest";
import { componentSchemaContaining, createNamedSchemaLookup } from "../namedSchemas";
import { createDocumentDeref } from "../jsonPointer";

describe("createNamedSchemaLookup", () => {
  const address = { type: "object", properties: { city: { type: "string" } } };
  const schemas = { address, user: { type: "object", properties: { home: address } } };

  it("names a component schema by identity", () => {
    expect(createNamedSchemaLookup(schemas)(address)).toBe("address");
  });

  it("names a shallow copy sharing the schema's structural children", () => {
    expect(createNamedSchemaLookup(schemas)({ ...address })).toBe("address");
  });

  it("doesn't name a copy of a different type", () => {
    expect(createNamedSchemaLookup(schemas)({ ...address, type: "string" })).toBeUndefined();
  });

  it("doesn't name an unrelated schema", () => {
    expect(createNamedSchemaLookup(schemas)({ type: "object", properties: {} })).toBeUndefined();
  });

  it("follows a cycle-cut `$ref` stub child to wherever the child first appeared", () => {
    // resolveDocument records a child's first location, which in a document
    // whose paths come before components is under #/paths, not the schema.
    const doc = {
      paths: { "/a": { get: { responses: { "200": { schema: { properties: address.properties } } } } } },
      components: { schemas },
    };
    const lookup = createNamedSchemaLookup(schemas, createDocumentDeref(doc));
    const cut = { type: "object", properties: { $ref: "#/paths/~1a/get/responses/200/schema/properties" } };
    expect(lookup(cut)).toBe("address");
  });
});

describe("componentSchemaContaining", () => {
  it("names the component schema a pointer is in", () => {
    expect(componentSchemaContaining("#/components/schemas/account/properties")).toBe("account");
    expect(componentSchemaContaining("#/components/schemas/a~1b")).toBe("a/b");
    expect(componentSchemaContaining("#/paths/~1a")).toBeUndefined();
  });
});
