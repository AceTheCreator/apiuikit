import { describe, expect, it } from "vitest";
import { parseDocument } from "../openapiParser";

const base = { openapi: "3.0.3", info: { title: "Example", version: "1" }, paths: {} };

describe("tolerant OpenAPI parsing", () => {
  it("retains a document with missing required metadata", async () => {
    const result = await parseDocument(JSON.stringify({ ...base, info: { title: "Example" } }));
    expect(result.status).toBe("partial");
    expect(result.document?.info.title).toBe("Example");
    expect(result.diagnostics.some((item) => item.severity === 0)).toBe(true);
  });

  it("preserves broken references and reports them", async () => {
    const result = await parseDocument(JSON.stringify({
      ...base, components: { schemas: { Missing: { $ref: "#/components/schemas/Absent" } } },
    }));
    expect(result.status).toBe("partial");
    expect(result.document?.components?.schemas?.Missing).toEqual({ $ref: "#/components/schemas/Absent" });
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it.each(["{", "openapi: [", "null", "[]", "hello", JSON.stringify({ ...base, openapi: "2.0" })])(
    "rejects unreadable or unsupported input: %s", async (raw) => {
      const result = await parseDocument(raw);
      expect(result.status).toBe("unrenderable");
      expect(result.document).toBeNull();
      expect(result.diagnostics.length).toBeGreaterThan(0);
    },
  );

  it("reports one defect once, with a segmented path instead of oneOf noise", async () => {
    const result = await parseDocument(JSON.stringify({ ...base, paths: { "/items/{id}": { get: {
      parameters: [{ name: "id", in: "path", required: false, schema: { type: "string" } }],
      responses: { 200: { description: "OK" } },
    } } } }));
    expect(result.status).toBe("partial");
    const messages = result.diagnostics.map((item) => item.message);
    expect(messages).not.toContain("must have required property '$ref'");
    expect(messages).not.toContain("must match exactly one schema in oneOf");
    expect(new Set(result.diagnostics.map((item) => JSON.stringify(item))).size).toBe(result.diagnostics.length);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
      path: ["paths", "/items/{id}", "get", "parameters", "0", "required"],
    })]));
  });

  it("retains recursive schemas without passing validation's cycles back to Scalar", async () => {
    const result = await parseDocument(JSON.stringify({ ...base, components: { schemas: {
      Node: { type: "object", properties: { child: { $ref: "#/components/schemas/Node" } } },
    } } }));
    expect(result.status).toBe("ready");
    expect(result.document).not.toBeNull();
  });
});
