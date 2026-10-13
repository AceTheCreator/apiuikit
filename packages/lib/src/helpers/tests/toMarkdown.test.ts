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

  it("omits the Authorization block for a server with no security", () => {
    const md = asyncApiToMarkdown(doc, noopDeref);
    expect(md).not.toContain("**Authorization:**");
  });

  describe("server security", () => {
    const securedDoc: AsyncAPIDocumentData = {
      info: { title: "Streetlight API", version: "1.0.0" },
      servers: {
        production: {
          host: "api.streetlights.io",
          protocol: "kafka-secure",
          security: [
            {
              type: "oauth2",
              flows: {
                clientCredentials: {
                  tokenUrl: "https://auth.streetlights.io/token",
                  availableScopes: { "streetlights:read": "Read streetlight data" },
                },
              },
            },
            { type: "userPassword", description: "Or authenticate with a username and password." },
          ] as never,
        },
      },
    };

    it("resolves a server's security list into an Authorization block", () => {
      const md = asyncApiToMarkdown(securedDoc, noopDeref);
      expect(md).toContain("**Authorization:**");
      expect(md).toContain("**OAuth2**");
      expect(md).toContain("Flow `clientCredentials`");
      expect(md).toContain("Token URL: `https://auth.streetlights.io/token`");
      expect(md).toContain("Available scopes: `streetlights:read`");
      expect(md).toContain("**User / Password**");
      expect(md).toContain("Or authenticate with a username and password.");
    });

    it("includes the server security in the single-operation export too", () => {
      const opDoc: AsyncAPIDocumentData = {
        ...securedDoc,
        operations: {
          receiveLightMeasured: {
            action: "receive" as never,
            channel: { address: "light/measured" } as never,
          },
        },
      };
      const md = asyncApiOperationToMarkdown(opDoc, "receiveLightMeasured", noopDeref);
      expect(md).toContain("**Authorization:**");
      expect(md).toContain("**OAuth2**");
    });
  });

  it("references a component schema that refers to itself instead of recursing", () => {
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
    const nodeBlock = firstJsonBlock(md.slice(md.indexOf("`node`"))) as { properties: { child: unknown } };
    expect(nodeBlock.properties.child).toEqual({ $ref: "#/components/schemas/node" });
  });

  it("references a component schema in a real object-identity cycle (no $ref)", () => {
    // Mirrors what a with-parser document (e.g. @scalar/openapi-parser) can hand
    // back: an actual JS object cycle, not a leftover `$ref` marker.
    const node: Record<string, unknown> = { type: "object", properties: {} };
    (node.properties as Record<string, unknown>).self = node;

    const circularDoc: AsyncAPIDocumentData = {
      info: { title: "Circular", version: "1.0.0" },
      components: { schemas: { node: node as never } },
    };

    const md = asyncApiToMarkdown(circularDoc, () => undefined);
    const nodeBlock = firstJsonBlock(md.slice(md.indexOf("`node`"))) as { properties: { self: unknown } };
    expect(nodeBlock.properties.self).toEqual({ $ref: "#/components/schemas/node" });
  });

  it("does not recurse infinitely on a cycle outside the component schemas", () => {
    const node: Record<string, unknown> = { type: "object", properties: {} };
    (node.properties as Record<string, unknown>).self = node;

    const circularDoc: AsyncAPIDocumentData = {
      info: { title: "Circular", version: "1.0.0" },
      components: { messages: { tree: { name: "tree", payload: node as never } } },
    };

    const md = asyncApiToMarkdown(circularDoc, () => undefined);
    expect(md).toContain("circular reference");
  });

  it("references another component schema by $ref, rendered once under Schemas", () => {
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
    const userBlock = firstJsonBlock(md.slice(md.indexOf("`user`"))) as { properties: { home: unknown } };
    expect(userBlock.properties.home).toEqual({ $ref: "#/components/schemas/address" });
    const addressBlock = firstJsonBlock(md.slice(md.indexOf("`address`"))) as {
      properties: { city: { type: string } };
    };
    expect(addressBlock.properties.city.type).toBe("string");
  });

  it("still inlines a $ref target that isn't a component schema", () => {
    const refDoc: AsyncAPIDocumentData = {
      info: { title: "Refs", version: "1.0.0" },
      components: {
        messages: { addressMessage: { name: "addressMessage", payload: { type: "object", properties: { city: { type: "string" } } } as never } },
        schemas: {
          user: { type: "object", properties: { home: { $ref: "#/components/messages/addressMessage/payload" } } },
        },
      },
    };
    const deref = (ref: string) =>
      ref === "#/components/messages/addressMessage/payload" ? refDoc.components!.messages!.addressMessage.payload : undefined;

    const md = asyncApiToMarkdown(refDoc, deref as never);
    const userBlock = firstJsonBlock(md.slice(md.indexOf("`user`"))) as {
      properties: { home: { properties: { city: { type: string } } } };
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
    const userBlock = firstJsonBlock(md.slice(md.indexOf("`user`"))) as { properties: { home: unknown; work: unknown } };
    expect(userBlock.properties.home).toEqual({ $ref: "#/components/schemas/address" });
    expect(userBlock.properties.work).toEqual({ $ref: "#/components/schemas/address" });
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

    it("references component schemas and renders each once under Referenced Schemas", () => {
      // Shared objects, as resolveDocument leaves inlined $ref targets.
      const address: Record<string, unknown> = { type: "object", properties: { city: { type: "string" } } };
      const customer: Record<string, unknown> = {
        type: "object",
        properties: { billing: address, shipping: address },
      };
      const refDoc = {
        openapi: "3.1.0",
        info: { title: "Shop", version: "1" },
        paths: {
          "/customers": {
            get: {
              responses: {
                "200": { description: "OK", content: { "application/json": { schema: customer } } },
                default: { description: "Error", content: { "application/json": { schema: customer } } },
              },
            },
          },
        },
        components: { schemas: { customer, address } },
      } as unknown as OpenAPIDocumentData;

      const md = openApiEndpointToMarkdown(refDoc, "get", "/customers", noopDeref);
      // A body that is itself a component schema is expanded one level…
      const endpoint = md.slice(md.indexOf("GET `/customers`"), md.indexOf("## Referenced Schemas"));
      expect(firstJsonBlock(endpoint)).toEqual({
        type: "object",
        properties: {
          billing: { $ref: "#/components/schemas/address" },
          shipping: { $ref: "#/components/schemas/address" },
        },
      });

      // …and what it references is rendered once, however often it's reached.
      const referenced = md.slice(md.indexOf("## Referenced Schemas"));
      expect(referenced.match(/#### `/g)).toHaveLength(1);
      expect(firstJsonBlock(referenced.slice(referenced.indexOf("`address`")))).toEqual(address);
    });

    it("recognizes a component schema inlined as a shallow copy, as @scalar/openapi-parser does", () => {
      const address: Record<string, unknown> = { type: "object", properties: { city: { type: "string" } } };
      const refDoc = {
        openapi: "3.1.0",
        info: { title: "Shop", version: "1" },
        paths: {
          "/address": {
            get: { responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { address: { ...address } } } } } } } },
          },
        },
        components: { schemas: { address } },
      } as unknown as OpenAPIDocumentData;

      const md = openApiEndpointToMarkdown(refDoc, "get", "/address", noopDeref);
      expect(firstJsonBlock(md.slice(md.indexOf("GET `/address`")))).toEqual({
        type: "object",
        properties: { address: { $ref: "#/components/schemas/address" } },
      });
      expect(md).toContain("#### `address`");
    });
  });

  describe("security schemes", () => {
    const securedDoc: OpenAPIDocumentData = {
      openapi: "3.0.0",
      info: { title: "Pet Store", version: "1.0.0" },
      paths: {
        "/pets": {
          get: {
            summary: "List pets",
            responses: { "200": { description: "A list of pets" } },
            security: [{ apiKeyAuth: [] }],
          },
        },
        "/pets/{id}": {
          delete: {
            summary: "Delete a pet",
            responses: { "204": { description: "Deleted" } },
            // No operation-level `security` — falls back to the doc's global `security`.
          },
        },
      },
      components: {
        securitySchemes: {
          apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" } as never,
          oauth: {
            type: "oauth2",
            flows: {
              clientCredentials: {
                tokenUrl: "https://api.petstore.io/oauth/token",
                scopes: { "pets:read": "Read pets", "pets:write": "Write pets" },
              },
            },
          } as never,
        },
      },
      security: [{ oauth: ["pets:read"] }],
    };

    it("resolves an operation's security requirement against components.securitySchemes", () => {
      const md = openApiToMarkdown(securedDoc, noopDeref);
      const petsSection = md.slice(md.indexOf("GET `/pets`"), md.indexOf("DELETE"));
      expect(petsSection).toContain("**Authorization:**");
      expect(petsSection).toContain("API Key (header: `X-API-Key`)");
      expect(petsSection).toContain("`apiKeyAuth`");
    });

    it("falls back to the document's global security when an operation declares none", () => {
      const md = openApiToMarkdown(securedDoc, noopDeref);
      const deleteSection = md.slice(md.indexOf("DELETE"));
      expect(deleteSection).toContain("**Authorization:**");
      expect(deleteSection).toContain("OAuth2");
      expect(deleteSection).toContain("Flow `clientCredentials`");
      expect(deleteSection).toContain("Token URL: `https://api.petstore.io/oauth/token`");
      expect(deleteSection).toContain("Required scopes: `pets:read`");
    });

    it("includes the resolved security in the single-endpoint export", () => {
      const md = openApiEndpointToMarkdown(securedDoc, "get", "/pets", noopDeref);
      expect(md).toContain("**Authorization:**");
      expect(md).toContain("API Key (header: `X-API-Key`)");
    });

    it("omits the Authorization block when there's no security", () => {
      const md = openApiToMarkdown(doc, noopDeref);
      expect(md).not.toContain("**Authorization:**");
    });
  });
});
