import { describe, expect, it } from "vitest";
import { asyncApiOperationToMarkdown, asyncApiToMarkdown, openApiEndpointToMarkdown, openApiToMarkdown } from "../toMarkdown";
import { AsyncAPIDocumentData } from "../../types/schema";
import { OpenAPIDocumentData } from "../../types/openapi";

const noopDeref = () => undefined;

/** Extracts and parses the first fenced ```json code block in `md`. */
function firstJsonBlock(md: string): unknown {
  const match = md.match(/```json\n([\s\S]*?)\n```/);
  if (!match) throw new Error("no fenced json block found in markdown");
  return JSON.parse(match[1]);
}

describe("asyncApiToMarkdown", () => {
  const doc: AsyncAPIDocumentData = {
    info: { title: "Streetlight API", version: "1.0.0", description: "Monitors streetlights." },
    servers: {
      production: { host: "api.streetlights.io", protocol: "kafka", description: "Production broker" },
    },
    operations: {
      receiveLightMeasured: {
        action: "receive" as never,
        channel: { address: "light/measured" } as never,
        messages: [{ name: "lightMeasured", title: "Light Measured" }] as never,
        summary: "Inform about light measurement",
      },
    },
    components: {
      messages: {
        lightMeasured: {
          name: "lightMeasured",
          title: "Light Measured",
          contentType: "application/json",
          payload: {
            type: "object",
            properties: { id: { type: "integer", description: "Light id" } },
          } as never,
        },
      },
      schemas: {
        lightMeasuredPayload: {
          type: "object",
          description: "Payload for a light measurement",
          properties: {
            id: { type: "integer" },
            lumens: { type: "integer", description: "Light intensity" },
          },
          required: ["id"],
        },
      },
    },
  };

  it("includes title, version, and description", () => {
    const md = asyncApiToMarkdown(doc, noopDeref);
    expect(md).toContain("# Streetlight API");
    expect(md).toContain("**Version:** 1.0.0");
    expect(md).toContain("Monitors streetlights.");
  });

  it("includes servers, operations, messages, and schemas", () => {
    const md = asyncApiToMarkdown(doc, noopDeref);
    expect(md).toContain("## Servers");
    expect(md).toContain("api.streetlights.io");
    expect(md).toContain("## Operations");
    expect(md).toContain("light/measured");
    expect(md).toContain("## Messages");
    expect(md).toContain("Light Measured");
    expect(md).toContain("## Schemas");
    expect(md).toContain("lumens");
    expect(md).toContain("Light intensity");
  });

  it("does not recurse infinitely on a circular schema $ref", () => {
    const circularDoc: AsyncAPIDocumentData = {
      info: { title: "Circular", version: "1.0.0" },
      components: {
        schemas: {
          node: {
            type: "object",
            properties: {
              child: { $ref: "#/components/schemas/node" },
            },
          },
        },
      },
    };
    const deref = (ref: string) =>
      ref === "#/components/schemas/node" ? circularDoc.components!.schemas!.node : undefined;

    const md = asyncApiToMarkdown(circularDoc, deref);
    expect(md).toContain("circular reference");
  });

  it("does not recurse infinitely on a real object-identity cycle (no $ref)", () => {
    // Mirrors what a with-parser document (e.g. @scalar/openapi-parser) can hand
    // back: an actual JS object cycle, not a leftover `$ref` marker.
    const node: Record<string, unknown> = { type: "object", properties: {} };
    (node.properties as Record<string, unknown>).self = node;

    const circularDoc: AsyncAPIDocumentData = {
      info: { title: "Circular", version: "1.0.0" },
      components: { schemas: { node: node as never } },
    };

    const md = asyncApiToMarkdown(circularDoc, () => undefined);
    expect(md).toContain("circular reference");
  });

  it("renders schema components as a fenced ```json code block", () => {
    const md = asyncApiToMarkdown(doc, noopDeref);
    const parsed = firstJsonBlock(md.slice(md.indexOf("## Schemas"))) as {
      properties: { lumens: { description: string } };
    };
    expect(parsed.properties.lumens.description).toBe("Light intensity");
  });

  it("inlines a $ref target's fields instead of leaving a $ref marker", () => {
    const refDoc: AsyncAPIDocumentData = {
      info: { title: "Refs", version: "1.0.0" },
      components: {
        schemas: {
          address: { type: "object", properties: { city: { type: "string" } } },
          user: {
            type: "object",
            properties: { home: { $ref: "#/components/schemas/address" } },
          },
        },
      },
    };
    const deref = (ref: string) =>
      ref === "#/components/schemas/address" ? refDoc.components!.schemas!.address : undefined;

    const md = asyncApiToMarkdown(refDoc, deref as never);
    const userBlock = firstJsonBlock(md.slice(md.indexOf("`user`"))) as {
      properties: { home: { type: string; properties: { city: { type: string } } } };
    };
    expect(userBlock.properties.home.properties.city.type).toBe("string");
  });

  it("does not falsely flag a schema shared by two $refs as circular", () => {
    const sharedDoc: AsyncAPIDocumentData = {
      info: { title: "Shared", version: "1.0.0" },
      components: {
        schemas: {
          address: { type: "object", properties: { city: { type: "string" } } },
          user: {
            type: "object",
            properties: {
              home: { $ref: "#/components/schemas/address" },
              work: { $ref: "#/components/schemas/address" },
            },
          },
        },
      },
    };
    const deref = (ref: string) =>
      ref === "#/components/schemas/address" ? sharedDoc.components!.schemas!.address : undefined;

    const md = asyncApiToMarkdown(sharedDoc, deref as never);
    const userBlock = firstJsonBlock(md.slice(md.indexOf("`user`"))) as {
      properties: { home: { properties: { city: { type: string } } }; work: { properties: { city: { type: string } } } };
    };
    expect(userBlock.properties.home.properties.city.type).toBe("string");
    expect(userBlock.properties.work.properties.city.type).toBe("string");
    expect(md).not.toContain("circular reference");
  });

  describe("asyncApiOperationToMarkdown", () => {
    const multiOpDoc: AsyncAPIDocumentData = {
      info: { title: "Streetlight API", version: "1.0.0", description: "Monitors streetlights." },
      servers: {
        production: { host: "api.streetlights.io", protocol: "kafka", description: "Production broker" },
      },
      operations: {
        receiveLightMeasured: {
          action: "receive" as never,
          channel: { address: "light/measured" } as never,
          summary: "Inform about light measurement",
          messages: [
            {
              name: "lightMeasured",
              title: "Light Measured",
              contentType: "application/json",
              payload: { type: "object", properties: { lumens: { type: "integer", description: "Light intensity" } } },
            },
          ] as never,
        },
        turnOnLight: {
          action: "send" as never,
          channel: { address: "light/turn-on" } as never,
          summary: "Turn on a light",
        },
      },
    };

    it("includes doc info, servers, and only the targeted operation", () => {
      const md = asyncApiOperationToMarkdown(multiOpDoc, "receiveLightMeasured", noopDeref);
      expect(md).toContain("# Streetlight API");
      expect(md).toContain("**Version:** 1.0.0");
      expect(md).toContain("## Servers");
      expect(md).toContain("api.streetlights.io");
      expect(md).toContain("RECEIVE `receiveLightMeasured`");
      expect(md).toContain("light/measured");

      // Must not dump the rest of the document — just this one operation.
      expect(md).not.toContain("## Operations");
      expect(md).not.toContain("## Messages");
      expect(md).not.toContain("## Schemas");
      expect(md).not.toContain("turnOnLight");
      expect(md).not.toContain("light/turn-on");
    });

    it("inlines the operation's message payload as a fenced json code block", () => {
      const md = asyncApiOperationToMarkdown(multiOpDoc, "receiveLightMeasured", noopDeref);
      const parsed = firstJsonBlock(md.slice(md.indexOf("`payload`"))) as {
        properties: { lumens: { description: string } };
      };
      expect(parsed.properties.lumens.description).toBe("Light intensity");
    });

    it("returns an empty string when the operation doesn't exist", () => {
      expect(asyncApiOperationToMarkdown(multiOpDoc, "nonexistent", noopDeref)).toBe("");
    });
  });
});

describe("openApiToMarkdown", () => {
  const doc: OpenAPIDocumentData = {
    openapi: "3.0.0",
    info: { title: "Pet Store", version: "1.0.0", description: "A sample API." },
    servers: [{ url: "https://api.petstore.io", description: "Production" }],
    paths: {
      "/pets": {
        get: {
          summary: "List pets",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }] as never,
          responses: {
            "200": {
              description: "A list of pets",
              content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
            } as never,
          },
        },
      },
      "/pets/{id}": {
        get: {
          summary: "Get a pet",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] as never,
          responses: { "200": { description: "A pet" } },
        },
      },
    },
    components: {
      schemas: {
        Pet: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
    },
  };

  it("includes title, servers, endpoints, and schemas", () => {
    const md = openApiToMarkdown(doc, noopDeref);
    expect(md).toContain("# Pet Store");
    expect(md).toContain("## Servers");
    expect(md).toContain("https://api.petstore.io");
    expect(md).toContain("## Endpoints");
    expect(md).toContain("GET `/pets`");
    expect(md).toContain("List pets");
    expect(md).toContain("limit");
    expect(md).toContain("## Schemas");
    expect(md).toContain("Pet");
  });

  it("renders a response body schema as a fenced json code block", () => {
    const md = openApiToMarkdown(doc, noopDeref);
    const parsed = firstJsonBlock(md.slice(md.indexOf("GET `/pets`"))) as { type: string; items: { type: string } };
    expect(parsed).toEqual({ type: "array", items: { type: "string" } });
  });

  describe("openApiEndpointToMarkdown", () => {
    it("includes doc info, servers, and only the targeted endpoint", () => {
      const md = openApiEndpointToMarkdown(doc, "get", "/pets", noopDeref);
      expect(md).toContain("# Pet Store");
      expect(md).toContain("**Version:** 1.0.0");
      expect(md).toContain("## Servers");
      expect(md).toContain("https://api.petstore.io");
      expect(md).toContain("GET `/pets`");
      expect(md).toContain("List pets");
      expect(md).toContain("limit");

      // Must not dump the rest of the document — just this one endpoint.
      expect(md).not.toContain("## Endpoints");
      expect(md).not.toContain("## Schemas");
      expect(md).not.toContain("/pets/{id}");
      expect(md).not.toContain("Get a pet");
    });

    it("returns an empty string when the endpoint doesn't exist", () => {
      expect(openApiEndpointToMarkdown(doc, "post", "/nonexistent", noopDeref)).toBe("");
    });
  });
});
