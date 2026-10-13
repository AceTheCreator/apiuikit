import { describe, expect, it } from "vitest";
import { buildOpenAPISearchIndex } from "../openapiSearchIndex";
import type { OpenAPIDocumentData } from "../../types/openapi";

const asDoc = (doc: unknown) => doc as OpenAPIDocumentData;

const doc = asDoc({
  openapi: "3.1.0",
  info: { title: "Petstore", version: "1.0.0" },
  paths: {
    "/pets": { get: { summary: "List pets" } },
  },
  webhooks: {
    newPet: { post: { summary: "New pet notification" } },
  },
});

describe("buildOpenAPISearchIndex webhooks", () => {
  it("indexes webhooks into their own tab, with anchors distinct from endpoints", () => {
    const entries = buildOpenAPISearchIndex(doc);

    const webhook = entries.find((entry) => entry.type === "webhook");
    expect(webhook).toMatchObject({
      tab: "webhooks",
      key: "post newPet",
      targetId: "webhook-post newPet-detail",
      name: "New pet notification",
      path: "webhooks.newPet.post",
      location: "Webhooks > POST newPet",
    });
  });

  it("still indexes paths as endpoints alongside them", () => {
    const entries = buildOpenAPISearchIndex(doc);

    const endpoint = entries.find((entry) => entry.type === "endpoint");
    expect(endpoint).toMatchObject({
      tab: "endpoints",
      targetId: "endpoint-get /pets-detail",
      path: "paths./pets.get",
      location: "Endpoints > GET /pets",
    });
  });

  it("indexes no webhook entries for a document without them", () => {
    const entries = buildOpenAPISearchIndex(
      asDoc({ openapi: "3.0.0", info: { title: "X", version: "1" }, paths: { "/a": { get: {} } } }),
    );

    expect(entries.some((entry) => entry.type === "webhook")).toBe(false);
  });
});

describe("buildOpenAPISearchIndex schemas", () => {
  it("doesn't descend into another named schema, which is indexed on its own", () => {
    // Shared object, as resolveDocument leaves an inlined $ref target.
    const address = { type: "object", properties: { city: { type: "string" } } };
    const entries = buildOpenAPISearchIndex(
      asDoc({
        openapi: "3.1.0",
        info: { title: "X", version: "1" },
        paths: {},
        components: {
          schemas: {
            customer: { type: "object", properties: { address: { anyOf: [{ type: "string" }, address] } } },
            address,
          },
        },
      }),
    );

    const paths = entries.filter((entry) => entry.type === "schema").map((entry) => entry.path);
    expect(paths).toEqual([
      "components.schemas.customer",
      "components.schemas.customer.properties.address",
      "components.schemas.customer.properties.address.anyOf[0]",
      // The reference site itself is still indexed…
      "components.schemas.customer.properties.address.anyOf[1]",
      // …but its contents only under the schema's own key.
      "components.schemas.address",
      "components.schemas.address.properties.city",
    ]);
  });

  it("recognizes a named schema inlined as a shallow copy, as @scalar/openapi-parser does", () => {
    const address = { type: "object", properties: { city: { type: "string" } } };
    const entries = buildOpenAPISearchIndex(
      asDoc({
        openapi: "3.1.0",
        info: { title: "X", version: "1" },
        paths: {},
        components: {
          schemas: {
            customer: { type: "object", properties: { address: { ...address } } },
            address,
          },
        },
      }),
    );

    const paths = entries.filter((entry) => entry.type === "schema").map((entry) => entry.path);
    expect(paths).toEqual([
      "components.schemas.customer",
      "components.schemas.customer.properties.address",
      "components.schemas.address",
      "components.schemas.address.properties.city",
    ]);
  });

  it("keeps scalar keywords in a node's text but not nested objects", () => {
    const entries = buildOpenAPISearchIndex(
      asDoc({
        openapi: "3.1.0",
        info: { title: "X", version: "1" },
        paths: {},
        components: {
          schemas: {
            charge: {
              type: "string",
              description: "A charge",
              enum: ["pending", "succeeded"],
              "x-expansionResources": { oneOf: [{ type: "object", description: "Inlined target schema" }] },
            },
          },
        },
      }),
    );

    const text = entries.find((entry) => entry.key === "charge")!.text;
    expect(text).toContain("A charge");
    expect(text).toContain("succeeded");
    expect(text).not.toContain("Inlined target schema");
  });
});
