import { describe, expect, it } from "vitest";
import { createDocumentDeref, resolveLocalPointer } from "../jsonPointer";

describe("resolveLocalPointer", () => {
  const document = {
    components: {
      schemas: {
        "path/name": { value: 1 },
        "tilde~name": { value: 2 },
        "space name": { value: 3 },
      },
    },
    "": "empty key",
  };

  it("resolves the root and escaped or encoded pointer tokens", () => {
    expect(resolveLocalPointer(document, "#")).toBe(document);
    expect(resolveLocalPointer(document, "#/components/schemas/path~1name")).toEqual({ value: 1 });
    expect(resolveLocalPointer(document, "#/components/schemas/tilde~0name")).toEqual({ value: 2 });
    expect(resolveLocalPointer(document, "#/components/schemas/space%20name")).toEqual({ value: 3 });
    expect(resolveLocalPointer(document, "#/")).toBe("empty key");
  });

  it("declines external, malformed, and missing pointers", () => {
    expect(resolveLocalPointer(document, "https://example.com/schema.json")).toBeUndefined();
    expect(resolveLocalPointer(document, "#/components/%E0%A4%A")).toBeUndefined();
    expect(resolveLocalPointer(document, "#/missing")).toBeUndefined();
  });
});

describe("createDocumentDeref", () => {
  it("keeps each resolver scoped to the document it was created for", () => {
    const first = createDocumentDeref({ value: "first" });
    const second = createDocumentDeref({ value: "second" });

    expect(first("#/value")).toBe("first");
    expect(second("#/value")).toBe("second");
  });
});
