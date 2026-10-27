import { describe, expect, it, vi } from "vitest";
import { parseArazzoDocument, resolveArazzoDocument } from "../arazzoModel";

// As if the optional `@usearazzo/parser` peer weren't installed.
vi.mock("@usearazzo/parser", () => {
  throw new Error("Cannot find package '@usearazzo/parser'");
});

const petsApi = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1" },
  paths: { "/pets": { get: { operationId: "listPets", responses: { 200: { description: "OK" } } } } },
};

const flows = {
  arazzo: "1.0.1",
  info: { title: "Flows", version: "1" },
  sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "shared", url: "./shared.yaml", type: "arazzo" }],
  workflows: [{ workflowId: "main", steps: [{ stepId: "list", operationId: "listPets", successCriteria: [{ condition: "$statusCode == 200" }] }] }],
};

describe("without @usearazzo/parser", () => {
  it("still resolves pre-parsed documents, expressions included", async () => {
    const result = await resolveArazzoDocument(flows, { sources: { pets: petsApi, shared: { ...flows, sourceDescriptions: [{ name: "pets", url: "https://x/pets.json" }] } } });
    expect(result.model?.workflows[0].steps[0]).toMatchObject({
      target: { status: "linked", path: "/pets" },
      successCriteria: [{ conditionNode: { type: "BinaryExpression" } }],
    });
  });

  it("explains how to install it when given raw text", async () => {
    const result = await parseArazzoDocument("arazzo: 1.0.1");
    expect(result.status).toBe("unrenderable");
    expect(result.diagnostics).toEqual([expect.objectContaining({ message: expect.stringContaining("npm i @usearazzo/parser"), severity: 0 })]);
  });

  it("leaves a raw Arazzo source unresolved, with the same explanation", async () => {
    const result = await resolveArazzoDocument(flows, { sources: { pets: petsApi, shared: "arazzo: 1.0.1" } });
    expect(result.model?.sources[1]).toMatchObject({ status: "unresolved", reason: "parse-failed" });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ source: "shared", message: expect.stringContaining("npm i @usearazzo/parser") })]));
  });
});
