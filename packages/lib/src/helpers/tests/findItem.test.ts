import { describe, expect, it } from "vitest";
import { describeEndpointSelector, findEndpoint } from "../findItem";
import type { OpenAPIPathItemData } from "../../types/openapi";

const paths = {
  "/pets": {
    get: { operationId: "listPets", responses: {} },
    post: { operationId: "addPet", responses: {} },
  },
  "/pets/{petId}": {
    get: { responses: {} },
  },
} as unknown as Record<string, OpenAPIPathItemData>;

describe("findEndpoint", () => {
  it("finds an endpoint by operationId", () => {
    expect(findEndpoint(paths, { operationId: "addPet" })).toMatchObject({ method: "post", path: "/pets" });
  });

  it("finds an endpoint by method and path, including one without an operationId", () => {
    expect(findEndpoint(paths, { method: "get", path: "/pets/{petId}" })).toMatchObject({
      method: "get",
      path: "/pets/{petId}",
    });
  });

  it("matches the method case-insensitively", () => {
    // Uppercase is what people type, even though the type says lowercase.
    const selector = { method: "POST", path: "/pets" } as unknown as Parameters<typeof findEndpoint>[1];
    expect(findEndpoint(paths, selector)).toMatchObject({ method: "post" });
  });

  it("returns null for an unknown operationId, path, or method", () => {
    expect(findEndpoint(paths, { operationId: "nope" })).toBeNull();
    expect(findEndpoint(paths, { method: "get", path: "/nope" })).toBeNull();
    expect(findEndpoint(paths, { method: "delete", path: "/pets" })).toBeNull();
  });
});

describe("describeEndpointSelector", () => {
  it("names the selector readably", () => {
    expect(describeEndpointSelector({ operationId: "addPet" })).toBe('operationId "addPet"');
    expect(describeEndpointSelector({ method: "get", path: "/pets" })).toBe("GET /pets");
  });
});
