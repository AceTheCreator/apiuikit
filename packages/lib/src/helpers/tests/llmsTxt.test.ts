import { describe, expect, it } from "vitest";
import {
  documentToLlmsTxt,
  documentToMarkdown,
  listDocumentTargets,
  targetSlug,
} from "../llmsTxt";
import openapiDoc from "../../config/examples/openapi-petstore.json";
import asyncapiDoc from "../../config/examples/streetlight.json";
import type { MarkdownTarget } from "../../config/config";

describe("listDocumentTargets", () => {
  it("lists OpenAPI endpoints with method/path targets", () => {
    const targets = listDocumentTargets(openapiDoc);

    expect(targets.length).toBeGreaterThan(0);
    const listPets = targets.find((t) => t.key === "get /pets");
    expect(listPets?.label).toBe("GET /pets");
    expect(listPets?.summary).toBe("List all pets");
    expect(listPets?.target).toMatchObject({ kind: "operation", method: "get", path: "/pets" });
  });

  it("lists AsyncAPI operations with id targets", () => {
    const targets = listDocumentTargets(asyncapiDoc);

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target.target.kind).toBe("operation");
      expect(typeof target.target.id).toBe("string");
      // AsyncAPI operations are keyed, not method/path addressed.
      expect(target.target.method).toBeUndefined();
    }
  });

  it("throws on a document with no recognizable version key", () => {
    expect(() => listDocumentTargets({ title: "not a spec" })).toThrow(/Unrecognized document/);
    expect(() => listDocumentTargets(null)).toThrow(/Unrecognized document/);
  });
});

describe("documentToMarkdown", () => {
  it("serializes a whole document when no target is given, for either spec", () => {
    expect(documentToMarkdown(openapiDoc)).toContain("# Petstore API");
    expect(documentToMarkdown(asyncapiDoc)).toMatch(/^# /);
  });

  it("serializes a single OpenAPI endpoint from its target", () => {
    const target = listDocumentTargets(openapiDoc).find((t) => t.key === "get /pets")!;
    const markdown = documentToMarkdown(openapiDoc, target.target);

    expect(markdown).toContain("/pets");
    // A single endpoint, not the whole document.
    expect(markdown.length).toBeLessThan(documentToMarkdown(openapiDoc).length);
  });

  it("serializes a single AsyncAPI operation from its target", () => {
    const target = listDocumentTargets(asyncapiDoc)[0];
    const markdown = documentToMarkdown(asyncapiDoc, target.target);

    expect(markdown.length).toBeGreaterThan(0);
    expect(markdown.length).toBeLessThan(documentToMarkdown(asyncapiDoc).length);
  });

  it("rejects a target created for a different document", () => {
    const target = listDocumentTargets(openapiDoc)[0].target;
    expect(() => documentToMarkdown({ ...openapiDoc }, target)).toThrow(/different document/);
  });

  it("rejects an operation target that does not address the document's spec", () => {
    expect(() =>
      documentToMarkdown(
        openapiDoc,
        { kind: "operation", document: openapiDoc, id: "publishMessage" } as unknown as MarkdownTarget,
      ),
    ).toThrow(/method and path/);
    expect(() =>
      documentToMarkdown(
        asyncapiDoc,
        { kind: "operation", document: asyncapiDoc, method: "get", path: "/pets" } as unknown as MarkdownTarget,
      ),
    ).toThrow(/operation id/);
  });
});

describe("documentToLlmsTxt", () => {
  it("builds an llmstxt.org-shaped index from an OpenAPI document", () => {
    const txt = documentToLlmsTxt(openapiDoc, { baseUrl: "https://docs.acme.com" });
    const lines = txt.split("\n");

    expect(lines[0]).toBe("# Petstore API");
    expect(txt).toContain("\n> ");
    expect(txt).toContain("## Endpoints");
    expect(txt).toContain("- [GET /pets](https://docs.acme.com/get-pets.md): List all pets");
  });

  it("titles the section per spec", () => {
    expect(documentToLlmsTxt(asyncapiDoc, { baseUrl: "https://x.dev" })).toContain("## Operations");
  });

  it("uses a custom url resolver over the default slug", () => {
    const txt = documentToLlmsTxt(openapiDoc, {
      url: ({ target }) => `/api${target.path}/${target.method}.md`,
    });

    expect(txt).toContain("(/api/pets/get.md)");
  });

  it("omits entries whose resolver returns null", () => {
    const txt = documentToLlmsTxt(openapiDoc, {
      url: ({ target }) => (target.method === "get" ? "/only-gets.md" : null),
    });

    expect(txt).toContain("/only-gets.md");
    expect(txt).not.toContain("POST ");
  });

  it("appends optional links, e.g. the source spec", () => {
    const txt = documentToLlmsTxt(openapiDoc, {
      baseUrl: "https://docs.acme.com",
      optional: [
        { label: "OpenAPI spec", url: "https://docs.acme.com/openapi.yaml", description: "the source document" },
      ],
    });

    expect(txt).toContain("## Optional");
    expect(txt).toContain("- [OpenAPI spec](https://docs.acme.com/openapi.yaml): the source document");
  });

  it("lets title and summary be overridden", () => {
    const txt = documentToLlmsTxt(openapiDoc, { title: "Acme API", summary: "Everything Acme." });

    expect(txt.split("\n")[0]).toBe("# Acme API");
    expect(txt).toContain("> Everything Acme.");
  });

  it("trims a trailing slash from baseUrl rather than emitting a double slash", () => {
    const txt = documentToLlmsTxt(openapiDoc, { baseUrl: "https://docs.acme.com/" });

    expect(txt).toContain("https://docs.acme.com/get-pets.md");
    expect(txt).not.toContain("com//");
  });
});

describe("targetSlug", () => {
  it("makes a URL-safe slug from a target key", () => {
    expect(targetSlug("get /pets/{petId}")).toBe("get-pets-petid");
    expect(targetSlug("sendLightMeasurement")).toBe("sendlightmeasurement");
  });
});
