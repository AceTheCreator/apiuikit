import { describe, expect, it } from "vitest";
import {
  buildHarRequest,
  buildRequestUrl,
  generateSnippet,
  getAvailableCodeSampleTargets,
  pickRequestBodyMedia,
  resolveAuthPlaceholders,
  resolveServerBaseUrl,
} from "../codeSamples";
import exampleDoc from "../../config/examples/openapi-petstore.json";
import type { OpenAPIDocumentData } from "../../types/openapi";

const doc = exampleDoc as unknown as OpenAPIDocumentData;

describe("resolveServerBaseUrl", () => {
  it("returns the first server's url unchanged when it has no variables", () => {
    expect(resolveServerBaseUrl(doc.servers)).toBe("https://api.example.com/v1");
  });

  it("substitutes a server variable's default value", () => {
    const staging = [doc.servers![1]];
    expect(resolveServerBaseUrl(staging)).toBe("https://staging.example.com/v1");
  });

  it("falls back to a placeholder host when there are no servers", () => {
    expect(resolveServerBaseUrl(undefined)).toBe("http://localhost");
  });
});

describe("buildRequestUrl", () => {
  it("substitutes a path parameter's example value", () => {
    const parameters = [{ name: "petId", in: "path" as const, required: true, example: "abc-123" }];
    expect(buildRequestUrl("https://api.example.com/v1", "/pets/{petId}", parameters)).toBe(
      "https://api.example.com/v1/pets/abc-123",
    );
  });

  it("falls back to a literal token when no matching parameter is supplied", () => {
    expect(buildRequestUrl("https://api.example.com/v1", "/pets/{petId}", [])).toBe(
      "https://api.example.com/v1/pets/{petId}",
    );
  });
});

describe("resolveAuthPlaceholders", () => {
  it("resolves an apiKey scheme to its header name", () => {
    const placeholders = resolveAuthPlaceholders([{ apiKeyAuth: [] }], doc.components?.securitySchemes);
    expect(placeholders).toEqual([{ location: "header", name: "X-API-Key", value: "YOUR_API_KEY" }]);
  });

  it("resolves an oauth2 scheme to a bearer Authorization header", () => {
    const placeholders = resolveAuthPlaceholders([{ oauth2: ["write:pets"] }], doc.components?.securitySchemes);
    expect(placeholders).toEqual([{ location: "header", name: "Authorization", value: "Bearer YOUR_ACCESS_TOKEN" }]);
  });

  it("returns nothing when there is no security requirement", () => {
    expect(resolveAuthPlaceholders([], doc.components?.securitySchemes)).toEqual([]);
  });
});

describe("pickRequestBodyMedia", () => {
  it("prefers application/json and surfaces its schema", () => {
    const createPet = doc.paths!["/pets"]!.post!;
    const media = pickRequestBodyMedia(createPet.requestBody);
    expect(media?.contentType).toBe("application/json");
    expect(media?.schema).toBeDefined();
    expect(media?.authorExample).toBeUndefined();
  });

  it("returns null when there is no request body", () => {
    expect(pickRequestBodyMedia(undefined)).toBeNull();
  });
});

describe("buildHarRequest + generateSnippet", () => {
  it("produces a curl snippet containing the resolved URL and auth header for GET /pets/{petId}", () => {
    const getPet = doc.paths!["/pets/{petId}"]!.get!;
    const harRequest = buildHarRequest({
      method: "get",
      path: "/pets/{petId}",
      servers: doc.servers,
      parameters: getPet.parameters ?? [],
      security: getPet.security ?? doc.security ?? [],
      securitySchemes: doc.components?.securitySchemes,
      media: null,
      resolvedBodyValue: undefined,
    });

    expect(harRequest.url).toBe("https://api.example.com/v1/pets/{petId}");
    expect(harRequest.headers).toEqual([{ name: "X-API-Key", value: "YOUR_API_KEY" }]);

    const curl = generateSnippet(harRequest, "shell", "curl");
    // @readme/httpsnippet reformats the URL through Node's `url` module, which
    // percent-encodes "{"/"}" regardless of our own (deliberately unencoded)
    // input — so the generated snippet contains "%7BpetId%7D", not the literal
    // token. Assert on the stable parts rather than pin that third-party detail.
    expect(curl).toContain("https://api.example.com/v1/pets/");
    expect(curl).toContain("petId");
    expect(curl).toContain("X-API-Key: YOUR_API_KEY");
  });

  it("produces a JS and Python snippet including a JSON request body for POST /pets", () => {
    const createPet = doc.paths!["/pets"]!.post!;
    const media = pickRequestBodyMedia(createPet.requestBody);
    const harRequest = buildHarRequest({
      method: "post",
      path: "/pets",
      servers: doc.servers,
      parameters: [],
      security: createPet.security ?? doc.security ?? [],
      securitySchemes: doc.components?.securitySchemes,
      media,
      resolvedBodyValue: { name: "Fido", tag: "dog" },
    });

    expect(harRequest.postData?.mimeType).toBe("application/json");

    const js = generateSnippet(harRequest, "javascript", "fetch");
    expect(js).toContain("https://api.example.com/v1/pets");
    expect(js).toContain("Fido");

    const python = generateSnippet(harRequest, "python", "requests");
    expect(python).toContain("https://api.example.com/v1/pets");
    expect(python).toContain("Fido");
  });

  it("fails soft (empty string) for an unsupported target/client pair rather than throwing", () => {
    const harRequest = buildHarRequest({
      method: "get",
      path: "/pets",
      servers: doc.servers,
      parameters: [],
      security: [],
      securitySchemes: undefined,
      media: null,
      resolvedBodyValue: undefined,
    });
    expect(generateSnippet(harRequest, "nonexistent-target", "nonexistent-client")).toBe("");
  });
});

describe("getAvailableCodeSampleTargets", () => {
  it("includes the shell/curl, javascript/fetch, and python/requests targets used by default", () => {
    const targets = getAvailableCodeSampleTargets();
    const shell = targets.find((t) => t.key === "shell");
    const javascript = targets.find((t) => t.key === "javascript");
    const python = targets.find((t) => t.key === "python");

    expect(shell?.clients.some((c) => c.key === "curl")).toBe(true);
    expect(javascript?.clients.some((c) => c.key === "fetch")).toBe(true);
    expect(python?.clients.some((c) => c.key === "requests")).toBe(true);
  });

  it("exposes more than just the three default languages", () => {
    const targets = getAvailableCodeSampleTargets();
    const keys = targets.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(["go", "ruby", "swift", "csharp"]));
  });
});
