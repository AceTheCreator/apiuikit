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
