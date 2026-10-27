import { afterEach, describe, expect, it, vi } from "vitest";
import { parseArazzoDocument, resolveArazzoDocument } from "../arazzoModel";
import type { ArazzoDiagnostic, ArazzoResolveOptions, ArazzoSource, ArazzoStep } from "../../types/arazzo";
import { bnpl, petCoupons } from "./fixtures/arazzo";

// Small documents built inline: an OpenAPI source with two operations, and an
// Arazzo document whose single workflow calls whatever `steps` say.
const petsApi = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1" },
  paths: {
    "/pets": { get: { operationId: "listPets", responses: { 200: { description: "OK" } } } },
    "/pets/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      delete: { operationId: "deletePet", responses: { 204: { description: "Gone" } } },
    },
  },
  webhooks: { newPet: { post: { operationId: "petAdded", responses: { 200: { description: "OK" } } } } },
};

const storeApi = {
  openapi: "3.0.3",
  info: { title: "Store", version: "1" },
  paths: { "/orders": { get: { operationId: "listPets", responses: { 200: { description: "OK" } } } } },
};

const arazzo = (fields: Record<string, unknown> = {}) => ({
  arazzo: "1.0.1",
  info: { title: "Flows", version: "1.0.0" },
  sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }],
  workflows: [{ workflowId: "main", steps: [{ stepId: "list", operationId: "listPets" }] }],
  ...fields,
});

const withSteps = (steps: unknown[], fields: Record<string, unknown> = {}) =>
  arazzo({ workflows: [{ workflowId: "main", steps }], ...fields });

const errors = (diagnostics: ArazzoDiagnostic[]) => diagnostics.filter((item) => item.severity === 0);
const firstStep = (steps: ArazzoStep[]) => steps[0];
const source = (sources: ArazzoSource[] | undefined, name: string) => sources?.find((item) => item.name === name);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("official examples", () => {
  it("resolves pet-coupons with every step linked", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await parseArazzoDocument(petCoupons.arazzo, { sources: petCoupons.sources });

    expect(result.status).toBe("ready");
    expect(result.diagnostics).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    const [applyCoupon, buyPet] = result.model!.workflows;
    expect(applyCoupon.steps.map((step) => step.target)).toMatchObject([
      { kind: "operation", status: "linked", sourceName: "pet-coupons", method: "get", path: "/pet/findByTags" },
      { kind: "operation", status: "linked", method: "get", path: "/pet/{petId}/coupons" },
      { kind: "workflow", status: "linked", workflowId: "place-order" },
    ]);
    // `inputs: { $ref: "#/components/inputs/apply_coupon_input" }`, inlined for the schema components.
    expect(applyCoupon.inputs).toMatchObject({ type: "object", properties: { my_pet_tags: { type: "array" }, store_id: { type: "string" } } });
    // `{ reference: $components.parameters.page, value: 1 }`: the component, with its value overridden.
    expect(buyPet.steps[0].parameters.slice(1)).toMatchObject([
      { name: "page", in: "query", value: { kind: "literal", raw: 1 }, component: { componentName: "page" } },
      { name: "pageSize", in: "query", value: { kind: "literal", raw: 10 }, component: { componentName: "pageSize" } },
    ]);
  });

  it("resolves BNPL from the sources map instead of its absolute url, and reports the example's broken output and references", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await parseArazzoDocument(bnpl.arazzo, { sources: bnpl.sources });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.status).toBe("partial");
    expect(result.diagnostics).toEqual([{
      message: '"$steps.retrieveFinalizedPaymentPlan.finalizedPaymentPlan" is not a valid runtime expression.',
      path: ["workflows", "0", "outputs", "finalizedPaymentPlan"],
      severity: 0,
    }, {
      message: '$steps.authenticateCustomerAndAuthorizeLoan.outputs.redirectAuthToken: Step "authenticateCustomerAndAuthorizeLoan" has no output "redirectAuthToken".',
      path: ["workflows", "0", "steps", "4", "parameters", "0"],
      severity: 0,
    }, {
      message: '$steps.initiateBnplTransaction.outputs.loanTransactionId: Step "initiateBnplTransaction" has no output "loanTransactionId".',
      path: ["workflows", "0", "steps", "5", "parameters", "0"],
      severity: 0,
    }, {
      message: '$steps.initiateBnplTransaction.outputs.loanTransactionId: Step "initiateBnplTransaction" has no output "loanTransactionId".',
      path: ["workflows", "0", "steps", "6", "parameters", "0"],
      severity: 0,
    }]);
    expect(result.model!.workflows[0].steps.every((step) => step.target.status === "linked")).toBe(true);
  });
});

describe("reading Arazzo text", () => {
  it.each(["1.0.0", "1.0.1", "1.1.0"])("parses Arazzo %s", async (version) => {
    const raw = `arazzo: ${version}\ninfo: { title: T, version: '1' }\nsourceDescriptions: [{ name: pets, url: ./pets.yaml }]\nworkflows: [{ workflowId: w, steps: [{ stepId: s, operationId: listPets }] }]\n`;
    const result = await parseArazzoDocument(raw, { sources: { pets: petsApi } });
    expect(result.status).toBe("ready");
    expect(result.model?.arazzo).toBe(version);
  });

  it.each([
    ["", "The document is empty."],
    ["openapi: 3.0.0\ninfo: {}", "This is an OpenAPI document, not an Arazzo document."],
    ["asyncapi: 3.0.0\ninfo: {}", "This is an AsyncAPI document, not an Arazzo document."],
    ["arazzo: 2.0.0\ninfo: { title: x }", "Arazzo 2.0.0 is not supported. Supported versions are 1.0.x and 1.1.x."],
    ["arazzo: 1.0.1\ninfo: { title: x, version: 1\n", "The document could not be read. Check its YAML or JSON syntax."],
    ["hello", "Expected an Arazzo document, with a top-level `arazzo` field."],
    ["https://example.com/flows.arazzo.yaml", "Expected an Arazzo document, with a top-level `arazzo` field."],
  ])("rejects %j as unrenderable", async (raw, message) => {
    const result = await parseArazzoDocument(raw);
    expect(result).toMatchObject({ status: "unrenderable", document: null, model: null });
    expect(result.diagnostics).toEqual([{ message, path: [], severity: 0 }]);
  });

  it("explains invalid JSON", async () => {
    const result = await parseArazzoDocument('{"arazzo": "1.0.1", "info": {');
    expect(result.status).toBe("unrenderable");
    expect(result.diagnostics[0].message).toMatch(/^The document is not valid JSON: /);
  });

  it("never treats the text as a URL to fetch", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await parseArazzoDocument("https://example.com/flows.arazzo.yaml");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("rejects pre-parsed documents that aren't Arazzo", async () => {
    expect((await resolveArazzoDocument({ openapi: "3.1.0" })).status).toBe("unrenderable");
    expect((await resolveArazzoDocument({ ...arazzo(), arazzo: "2.0.0" })).status).toBe("unrenderable");
  });

  it("reports structural problems with their paths, and still renders", async () => {
    const result = await resolveArazzoDocument(arazzo({
      info: { title: 5 },
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "graphql" }, { name: "pets", url: "./b.yaml" }],
      workflows: [{
        workflowId: "main",
        steps: [
          { stepId: "a", operationId: "listPets", parameters: [{ name: "limit", value: 1 }], onFailure: [{ name: "x", type: "jump" }] },
          { stepId: "a", operationId: "listPets", operationPath: "{$sourceDescriptions.pets.url}#/paths/~1pets/get" },
          { stepId: "c", successCriteria: [{ condition: "$[?count(@) > 0]", type: "jsonpath" }] },
        ],
      }],
    }), { sources: { pets: petsApi } });

    expect(result.status).toBe("partial");
    expect(result.model).not.toBeNull();
    expect(errors(result.diagnostics).map(({ message, path }) => [path.join("."), message])).toEqual(expect.arrayContaining([
      ["info.title", '"title" must be a string, not a number.'],
      ["info", 'Missing required field "version".'],
      ["sourceDescriptions.0.type", "Source type must be one of openapi, arazzo in Arazzo 1.0.1."],
      ["sourceDescriptions.1.name", 'Duplicate source description name "pets".'],
      ["workflows.0.steps.0.parameters.0", "A parameter of an operation step needs \"in\" (path, query, header, cookie)."],
      ["workflows.0.steps.0.onFailure.0.type", "A failure action's type must be one of end, goto, retry."],
      ["workflows.0.steps.1.stepId", 'Duplicate stepId "a".'],
      ["workflows.0.steps.1", 'A step can have only one of "operationId", "operationPath".'],
      ["workflows.0.steps.2", 'A step needs one of "operationId", "operationPath" or "workflowId".'],
      ["workflows.0.steps.2.successCriteria.0", 'A jsonpath criterion needs a "context".'],
    ]));
    // Reported once, by validation, not again while linking.
    expect(result.diagnostics.filter((item) => item.path.join(".") === "workflows.0.steps.2")).toHaveLength(1);
    expect(result.model!.workflows[0].steps[2].target).toMatchObject({ kind: "none", status: "unlinked", reason: "no-target" });
    expect(result.model!.workflows[0].steps[1].target).toMatchObject({ status: "unlinked", reason: "multiple-targets" });
  });

  it("warns about workflow and step IDs outside letters, digits, \"-\" and \"_\", and still renders", async () => {
    const result = await resolveArazzoDocument(arazzo({
      workflows: [{ workflowId: "work/flow", steps: [{ stepId: "find/pet", operationId: "listPets" }] }],
    }), { sources: { pets: petsApi } });

    expect(result.model?.workflows[0].workflowId).toBe("work/flow");
    expect(result.diagnostics.filter((item) => item.severity === 1).map(({ message, path }) => [path.join("."), message])).toEqual(expect.arrayContaining([
      ["workflows.0.workflowId", 'Workflow IDs should only contain letters, digits, "-" and "_", so runtime expressions can refer to them.'],
      ["workflows.0.steps.0.stepId", 'Step IDs should only contain letters, digits, "-" and "_", so runtime expressions can refer to them.'],
    ]));
    expect(errors(result.diagnostics)).toEqual([]);
  });

  it("accepts asyncapi source types from Arazzo 1.1 on, but leaves them unresolved", async () => {
    const result = await resolveArazzoDocument(arazzo({
      arazzo: "1.1.0",
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "events", url: "./events.yaml", type: "asyncapi" }],
    }), { sources: { pets: petsApi } });
    expect(result.diagnostics.some((item) => item.path.join(".") === "sourceDescriptions.1.type")).toBe(false);
    expect(source(result.model?.sources, "events")).toMatchObject({ status: "unresolved", reason: "unsupported-type" });
    expect(result.status).toBe("partial");
  });
});

describe("resolving sources", () => {
  const resolve = (options: ArazzoResolveOptions, document = arazzo()) => resolveArazzoDocument(document, options);

  it("prefers the sources map, then loadSource, and never fetches when loadSource is given", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const loadSource = vi.fn(async () => storeApi);
    const fromMap = await resolve({ sources: { pets: petsApi }, loadSource });
    expect(source(fromMap.model?.sources, "pets")).toMatchObject({ status: "resolved", origin: "sources" });
    expect(loadSource).not.toHaveBeenCalled();

    const fromLoader = await resolve({ loadSource, baseUrl: "https://example.com/specs/flows.arazzo.yaml" });
    expect(source(fromLoader.model?.sources, "pets")).toMatchObject({ status: "resolved", origin: "loadSource", url: "https://example.com/specs/pets.yaml" });
    expect(loadSource).toHaveBeenCalledWith("https://example.com/specs/pets.yaml", expect.objectContaining({ name: "pets" }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes loadSource the url as written when there is no base", async () => {
    const loadSource = vi.fn(async () => petsApi);
    await resolve({ loadSource });
    expect(loadSource).toHaveBeenCalledWith("./pets.yaml", expect.anything());
  });

  it("fetches relative urls against baseUrl, and raw OpenAPI text goes through the OpenAPI parser", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(petsApi)));
    vi.stubGlobal("fetch", fetch);
    const result = await resolve({ baseUrl: "https://example.com/specs/" });
    expect(fetch).toHaveBeenCalledWith("https://example.com/specs/pets.yaml");
    expect(source(result.model?.sources, "pets")).toMatchObject({ status: "resolved", origin: "fetch", type: "openapi" });
    expect(result.status).toBe("ready");
  });

  it("fetches absolute urls without a baseUrl", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(petsApi)));
    vi.stubGlobal("fetch", fetch);
    const document = arazzo({ sourceDescriptions: [{ name: "pets", url: "https://api.example.com/openapi.json", type: "openapi" }] });
    const result = await resolve({}, document);
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/openapi.json");
    expect(result.status).toBe("ready");
  });

  it("detects the source type when the description leaves it out", async () => {
    const document = arazzo({ sourceDescriptions: [{ name: "pets", url: "./pets.yaml" }] });
    const result = await resolve({ sources: { pets: petsApi } }, document);
    expect(source(result.model?.sources, "pets")).toMatchObject({ status: "resolved", type: "openapi" });
  });

  it.each<[string, ArazzoResolveOptions, Record<string, unknown>, string]>([
    ["a relative url without baseUrl", {}, {}, "not-provided"],
    ["a source with no url", {}, { url: undefined }, "not-provided"],
    ["loadSource returning nothing", { loadSource: async () => undefined }, {}, "not-found"],
    ["loadSource throwing", { loadSource: async () => { throw new Error("denied"); } }, {}, "fetch-failed"],
    ["an OpenAPI 2.0 document", { sources: { pets: { swagger: "2.0", info: {} } } }, {}, "parse-failed"],
    ["unparseable OpenAPI text", { sources: { pets: "openapi: 3.0.0\ninfo: [" } }, {}, "parse-failed"],
    ["an Arazzo document declared as OpenAPI", { sources: { pets: arazzo() } }, {}, "type-mismatch"],
    ["an unsupported declared type", {}, { type: "graphql" }, "unsupported-type"],
  ])("leaves %s unresolved, with a reason", async (_, options, description, reason) => {
    const document = arazzo({ sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi", ...description }] });
    const result = await resolve(options, document);
    const pets = source(result.model?.sources, "pets");
    expect(pets).toMatchObject({ status: "unresolved", reason });
    expect(result.status).toBe("partial");
    // The step that needed it degrades to unlinked, without a second diagnostic.
    expect(firstStep(result.model!.workflows[0].steps).target).toMatchObject({ status: "unlinked", reason: "source-unavailable" });
    expect(result.diagnostics.filter((item) => item.path.join(".") === "workflows.0.steps.0.operationId")).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["sourceDescriptions", "0"], severity: 0, message: pets?.status === "unresolved" ? pets.message : "" }),
    ]));
  });

  it("reports failed fetches, including network errors such as CORS", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    const notFound = await resolve({ baseUrl: "https://example.com/" });
    expect(source(notFound.model?.sources, "pets")).toMatchObject({ reason: "fetch-failed", message: "Fetching https://example.com/pets.yaml failed with HTTP 404." });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const blocked = await resolve({ baseUrl: "https://example.com/" });
    expect(source(blocked.model?.sources, "pets")).toMatchObject({ reason: "fetch-failed", message: expect.stringContaining("cross-origin") });
  });

  it("attributes a source's parser diagnostics to that source", async () => {
    const broken = JSON.stringify({ ...petsApi, info: { title: "Pets" } });
    const result = await resolve({ sources: { pets: broken } });
    expect(source(result.model?.sources, "pets")).toMatchObject({ status: "resolved" });
    expect(result.status).toBe("partial");
    expect(result.diagnostics.some((item) => item.source === "pets" && item.severity === 0)).toBe(true);
  });

  it("loads each url once, however many sources share it", async () => {
    const loadSource = vi.fn(async () => petsApi);
    const document = arazzo({
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "again", url: "./pets.yaml", type: "openapi" }],
      workflows: [{ workflowId: "main", steps: [{ stepId: "list", operationId: "$sourceDescriptions.again.listPets" }] }],
    });
    const result = await resolve({ loadSource }, document);
    expect(loadSource).toHaveBeenCalledTimes(1);
    expect(result.model!.sources.every((item) => item.status === "resolved")).toBe(true);
  });
});

describe("nested Arazzo sources", () => {
  const flows = (sourceDescriptions: unknown[], workflowId = "shared") => ({
    arazzo: "1.0.1",
    info: { title: "Shared", version: "1" },
    sourceDescriptions,
    workflows: [{ workflowId, steps: [{ stepId: "list", operationId: "listPets" }] }],
  });

  it("resolves an Arazzo source and its own sources, relative to where it was loaded", async () => {
    const files: Record<string, unknown> = {
      "https://example.com/flows/shared.arazzo.yaml": flows([{ name: "pets", url: "../apis/pets.json", type: "openapi" }]),
      "https://example.com/apis/pets.json": petsApi,
    };
    const loadSource = vi.fn(async (url: string) => files[url] as Record<string, unknown>);
    const document = arazzo({
      sourceDescriptions: [{ name: "shared", url: "./flows/shared.arazzo.yaml", type: "arazzo" }],
      workflows: [{ workflowId: "main", steps: [{ stepId: "run", workflowId: "$sourceDescriptions.shared.shared" }] }],
    });
    const result = await resolveArazzoDocument(document, { loadSource, baseUrl: "https://example.com/main.arazzo.yaml" });

    expect(result.status).toBe("ready");
    const shared = source(result.model?.sources, "shared");
    expect(shared).toMatchObject({ status: "resolved", type: "arazzo" });
    expect(shared?.status === "resolved" && shared.type === "arazzo" && shared.model.sources[0]).toMatchObject({ name: "pets", status: "resolved" });
    expect(firstStep(result.model!.workflows[0].steps).target).toMatchObject({ kind: "workflow", status: "linked", sourceName: "shared", workflowId: "shared" });
  });

  it("labels nested diagnostics with the chain of source names", async () => {
    const shared = flows([{ name: "pets", url: "./pets.yaml", type: "openapi" }]);
    const result = await resolveArazzoDocument(
      arazzo({ sourceDescriptions: [{ name: "shared", url: "./shared.yaml", type: "arazzo" }], workflows: [{ workflowId: "main", steps: [{ stepId: "s", workflowId: "$sourceDescriptions.shared.shared" }] }] }),
      { sources: { shared } },
    );
    // `sources` only applies to the entry document, so the nested `pets` has nowhere to come from.
    expect(result.status).toBe("partial");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "shared", path: ["sourceDescriptions", "0"] }),
    ]));
  });

  it("stops at cycles", async () => {
    const files: Record<string, unknown> = {
      "https://example.com/a.yaml": flows([{ name: "b", url: "./b.yaml", type: "arazzo" }], "a"),
      "https://example.com/b.yaml": flows([{ name: "a", url: "./a.yaml", type: "arazzo" }], "b"),
    };
    const loadSource = vi.fn(async (url: string) => files[url] as Record<string, unknown>);
    const document = arazzo({ sourceDescriptions: [{ name: "a", url: "./a.yaml", type: "arazzo" }], workflows: [{ workflowId: "main", steps: [{ stepId: "s", workflowId: "$sourceDescriptions.a.a" }] }] });
    const result = await resolveArazzoDocument(document, { loadSource, baseUrl: "https://example.com/" });

    const a = source(result.model?.sources, "a");
    const b = a?.status === "resolved" && a.type === "arazzo" ? source(a.model.sources, "b") : undefined;
    const cyclic = b?.status === "resolved" && b.type === "arazzo" ? source(b.model.sources, "a") : undefined;
    expect(cyclic).toMatchObject({ status: "unresolved", reason: "cycle" });
    expect(loadSource).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("partial");
  });

  it("stops at maxDepth", async () => {
    const loadSource = vi.fn(async (url: string) => flows([{ name: "next", url: `${url}x`, type: "arazzo" }]));
    const document = arazzo({ sourceDescriptions: [{ name: "next", url: "https://example.com/x", type: "arazzo" }], workflows: [{ workflowId: "main", steps: [{ stepId: "s", workflowId: "main" }] }] });
    const result = await resolveArazzoDocument(document, { loadSource, maxDepth: 2 });
    expect(loadSource).toHaveBeenCalledTimes(2);
    expect(result.diagnostics.some((item) => item.source === "next/next" && /nested more than 2/.test(item.message))).toBe(true);
  });
});

describe("linking steps", () => {
  const link = async (steps: unknown[], sources: Record<string, unknown> = { pets: petsApi }, sourceDescriptions?: unknown[]) => {
    const result = await resolveArazzoDocument(
      withSteps(steps, sourceDescriptions ? { sourceDescriptions } : {}),
      { sources: sources as ArazzoResolveOptions["sources"] },
    );
    return { result, targets: result.model!.workflows[0].steps.map((step) => step.target) };
  };
  const twoSources = [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "store", url: "./store.yaml", type: "openapi" }];

  it("links a bare operationId, including webhooks", async () => {
    const { targets, result } = await link([{ stepId: "a", operationId: "deletePet" }, { stepId: "b", operationId: "petAdded" }]);
    expect(result.status).toBe("ready");
    expect(targets).toMatchObject([
      { kind: "operation", status: "linked", via: "operationId", sourceName: "pets", method: "delete", path: "/pets/{id}", isWebhook: false, operation: { operationId: "deletePet" } },
      { status: "linked", method: "post", path: "newPet", isWebhook: true },
    ]);
  });

  it("links a qualified operationId only within its source", async () => {
    const { targets } = await link(
      [{ stepId: "a", operationId: "$sourceDescriptions.store.listPets" }],
      { pets: petsApi, store: storeApi },
      twoSources,
    );
    expect(targets[0]).toMatchObject({ status: "linked", sourceName: "store", path: "/orders" });
  });

  it("refuses to guess an ambiguous bare operationId", async () => {
    const { targets, result } = await link([{ stepId: "a", operationId: "listPets" }], { pets: petsApi, store: storeApi }, twoSources);
    expect(targets[0]).toMatchObject({ status: "unlinked", reason: "ambiguous" });
    expect(result.diagnostics).toEqual([expect.objectContaining({ path: ["workflows", "0", "steps", "0", "operationId"], severity: 0 })]);
  });

  it("links an operationPath, with or without braces", async () => {
    const { targets } = await link([
      { stepId: "a", operationPath: "{$sourceDescriptions.pets.url}#/paths/~1pets~1{id}/delete" },
      { stepId: "b", operationPath: "$sourceDescriptions.pets.url#/paths/~1pets/get" },
    ]);
    expect(targets).toMatchObject([
      { status: "linked", via: "operationPath", method: "delete", path: "/pets/{id}" },
      { status: "linked", via: "operationPath", method: "get", path: "/pets" },
    ]);
  });

  it("links local and external workflowIds", async () => {
    const external = { arazzo: "1.0.1", info: { title: "x", version: "1" }, sourceDescriptions: [{ name: "pets", url: "https://example.com/pets.json" }], workflows: [{ workflowId: "remote", steps: [{ stepId: "s", operationId: "x" }] }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(petsApi))));
    const result = await resolveArazzoDocument({
      ...arazzo({ sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "flows", url: "./flows.yaml", type: "arazzo" }] }),
      workflows: [
        { workflowId: "main", steps: [{ stepId: "a", workflowId: "helper" }, { stepId: "b", workflowId: "$sourceDescriptions.flows.remote" }] },
        { workflowId: "helper", steps: [{ stepId: "a", operationId: "listPets" }] },
      ],
    }, { sources: { pets: petsApi, flows: external } });
    expect(result.model!.workflows[0].steps.map((step) => step.target)).toMatchObject([
      { kind: "workflow", status: "linked", workflowId: "helper" },
      { kind: "workflow", status: "linked", workflowId: "remote", sourceName: "flows" },
    ]);
  });

  it("links the forms Redocly's Museum example uses, warning with the standard form", async () => {
    const external = { arazzo: "1.0.1", info: { title: "x", version: "1" }, sourceDescriptions: [{ name: "pets", url: "https://example.com/pets.json" }], workflows: [{ workflowId: "remote", steps: [{ stepId: "s", operationId: "listPets" }] }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(petsApi))));
    const result = await resolveArazzoDocument({
      ...arazzo({ sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "flows", url: "./flows.yaml", type: "arazzo" }] }),
      workflows: [{
        workflowId: "main",
        steps: [
          { stepId: "a", operationId: "pets.deletePet" },
          { stepId: "b", operationPath: "$sourceDescriptions.pets#/paths/~1pets/get" },
          { stepId: "c", workflowId: "$sourceDescriptions.flows.workflows.remote" },
        ],
      }],
    }, { sources: { pets: petsApi, flows: external } });
    expect(result.model!.workflows[0].steps.map((step) => step.target)).toMatchObject([
      { status: "linked", ref: "pets.deletePet", sourceName: "pets", method: "delete" },
      { status: "linked", ref: "$sourceDescriptions.pets#/paths/~1pets/get", method: "get", path: "/pets" },
      { kind: "workflow", status: "linked", workflowId: "remote", sourceName: "flows" },
    ]);
    expect(result.status).toBe("ready");
    expect(result.diagnostics.map(({ message, severity }) => [severity, message])).toEqual([
      [1, "pets.deletePet isn't standard Arazzo; write it as $sourceDescriptions.pets.deletePet."],
      [1, "$sourceDescriptions.pets#/paths/~1pets/get isn't standard Arazzo; write it as {$sourceDescriptions.pets.url}#/paths/~1pets/get."],
      [1, "$sourceDescriptions.flows.workflows.remote isn't standard Arazzo; write it as $sourceDescriptions.flows.remote."],
    ]);
  });

  it("doesn't read a dotted operationId as qualified when no source has that name", async () => {
    const { targets } = await link([{ stepId: "a", operationId: "store.listPets" }]);
    expect(targets[0]).toMatchObject({ status: "unlinked", reason: "not-found" });
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["a missing operation", { operationId: "nope" }, "not-found"],
    ["a missing qualified operation", { operationId: "$sourceDescriptions.pets.nope" }, "not-found"],
    ["an unknown source name", { operationId: "$sourceDescriptions.other.listPets" }, "unknown-source"],
    ["an operationPath to nothing", { operationPath: "{$sourceDescriptions.pets.url}#/paths/~1nope/get" }, "not-found"],
    ["an operationPath to a non-operation", { operationPath: "{$sourceDescriptions.pets.url}#/paths/~1pets" }, "not-an-operation"],
    ["a malformed operationPath", { operationPath: "/paths/~1pets/get" }, "invalid-reference"],
    ["a missing local workflow", { workflowId: "nope" }, "not-found"],
    ["a workflow in an OpenAPI source", { workflowId: "$sourceDescriptions.pets.main" }, "wrong-source-type"],
  ])("reports %s", async (_, target, reason) => {
    const { targets, result } = await link([{ stepId: "a", ...target }]);
    expect(targets[0]).toMatchObject({ status: "unlinked", reason });
    expect(result.status).toBe("partial");
    expect(errors(result.diagnostics)).toHaveLength(1);
  });
});

describe("components, actions and expressions", () => {
  it("resolves component parameters and actions, and reports missing ones", async () => {
    const result = await resolveArazzoDocument(withSteps([{
      stepId: "list",
      operationId: "listPets",
      parameters: [{ reference: "$components.parameters.limit" }, { reference: "$components.parameters.missing" }],
      onFailure: [{ reference: "$components.failureActions.retryLater" }],
    }], {
      components: {
        parameters: { limit: { name: "limit", in: "query", value: "$inputs.limit" } },
        failureActions: { retryLater: { name: "retryLater", type: "retry", retryAfter: 5, retryLimit: 3, criteria: [{ condition: "$statusCode == 503" }] } },
      },
    }), { sources: { pets: petsApi } });

    const step = firstStep(result.model!.workflows[0].steps);
    expect(step.parameters[0]).toMatchObject({ name: "limit", in: "query", value: { kind: "expression", raw: "$inputs.limit" }, component: { reference: "$components.parameters.limit" } });
    expect(step.parameters[1]).toMatchObject({ name: "" });
    expect(step.onFailure[0]).toMatchObject({
      name: "retryLater",
      type: "retry",
      retryAfter: 5,
      retryLimit: 3,
      component: { componentType: "failureActions", componentName: "retryLater" },
      criteria: [{ path: ["components", "failureActions", "retryLater", "criteria", "0"] }],
    });
    expect(errors(result.diagnostics)).toEqual([{
      message: "There is no component $components.parameters.missing.",
      path: ["workflows", "0", "steps", "0", "parameters", "1", "reference"],
      severity: 0,
    }]);
  });

  it("lets a step parameter override a workflow parameter with the same name and location", async () => {
    const result = await resolveArazzoDocument(arazzo({
      workflows: [{
        workflowId: "main",
        parameters: [{ name: "limit", in: "query", value: 10 }, { name: "X-Trace", in: "header", value: "on" }],
        steps: [{ stepId: "list", operationId: "listPets", parameters: [{ name: "limit", in: "query", value: 50 }] }],
      }],
    }), { sources: { pets: petsApi } });
    expect(firstStep(result.model!.workflows[0].steps).parameters.map((item) => [item.name, item.value.raw, item.path.join(".")])).toEqual([
      ["X-Trace", "on", "workflows.0.parameters.1"],
      ["limit", 50, "workflows.0.steps.0.parameters.0"],
    ]);
  });

  it("checks goto targets and links dependsOn", async () => {
    const result = await resolveArazzoDocument(arazzo({
      workflows: [
        { workflowId: "main", dependsOn: ["setup", "nope"], steps: [{ stepId: "list", operationId: "listPets", onSuccess: [{ name: "again", type: "goto", stepId: "list" }, { name: "lost", type: "goto", stepId: "missing" }] }] },
        { workflowId: "setup", steps: [{ stepId: "s", operationId: "listPets" }] },
      ],
    }), { sources: { pets: petsApi } });
    const [main] = result.model!.workflows;
    expect(main.dependsOn).toMatchObject([{ status: "linked", workflowId: "setup" }, { status: "unlinked", reason: "not-found" }]);
    expect(main.steps[0].onSuccess).toMatchObject([{ stepId: "list", stepFound: true }, { stepId: "missing", stepFound: false }]);
    expect(errors(result.diagnostics).map((item) => item.path.join(".")).sort()).toEqual(["workflows.0.dependsOn.1", "workflows.0.steps.0.onSuccess.1.stepId"]);
  });

  it("parses expressions, templates and payloads, keeping the original text", async () => {
    const result = await resolveArazzoDocument(withSteps([{ stepId: "login", operationId: "listPets", outputs: { token: "$response.body#/token" } }, {
      stepId: "list",
      operationId: "listPets",
      parameters: [
        { name: "Authorization", in: "header", value: "Bearer {$steps.login.outputs.token}" },
        { name: "status", in: "query", value: "available" },
        { name: "price", in: "query", value: "$5" },
      ],
      requestBody: { contentType: "application/json", payload: { pet: { id: "$inputs.petId" }, tags: ["{$inputs.tag}", "x"] } },
      successCriteria: [
        { condition: "$statusCode == 200 && $response.body#/count > 0" },
        { context: "$response.body", condition: "$[?count(@.pets) > 0]", type: { type: "jsonpath", version: "draft-goessner-dispatch-jsonpath-00" } },
      ],
      outputs: { first: "$response.body#/0/id" },
    }]), { sources: { pets: petsApi } });

    const step = result.model!.workflows[0].steps[1];
    expect(step.parameters.map((item) => item.value)).toMatchObject([
      { kind: "template", parts: ["Bearer ", { text: "$steps.login.outputs.token", node: { type: "StepsExpression", stepId: "login", outputName: "token" } }] },
      { kind: "literal", raw: "available" },
      { kind: "literal", raw: "$5" },
    ]);
    expect(step.requestBody?.payload).toMatchObject({
      kind: "structure",
      expressions: [
        { pointer: "/pet/id", value: { kind: "expression", expression: { text: "$inputs.petId", node: { type: "InputsExpression", name: "petId" } } } },
        { pointer: "/tags/0", value: { kind: "template" } },
      ],
    });
    expect(step.successCriteria[0]).toMatchObject({ type: "simple", conditionNode: { type: "LogicalExpression" } });
    expect(step.successCriteria[0].expressions.map((item) => item.text)).toEqual(["$statusCode", "$response.body#/count"]);
    expect(step.successCriteria[1]).toMatchObject({ type: "jsonpath", version: "draft-goessner-dispatch-jsonpath-00", context: { kind: "expression", raw: "$response.body" } });
    expect(step.outputs).toMatchObject([{ name: "first", value: { kind: "expression", expression: { text: "$response.body#/0/id", node: { type: "ResponseExpression" } } } }]);
    expect(result.status).toBe("ready");
  });

  it("reports invalid expressions and conditions, keeping their text", async () => {
    const result = await resolveArazzoDocument(withSteps([{
      stepId: "list",
      operationId: "listPets",
      successCriteria: [{ condition: "$statusCode ===" }],
      outputs: { bad: "$steps.list.token" },
    }]), { sources: { pets: petsApi } });
    const step = firstStep(result.model!.workflows[0].steps);
    expect(step.outputs[0].value).toMatchObject({ kind: "expression", expression: { text: "$steps.list.token", node: null } });
    expect(step.successCriteria[0]).toMatchObject({ condition: "$statusCode ===", conditionNode: null });
    expect(errors(result.diagnostics).map((item) => item.path.join("."))).toEqual([
      "workflows.0.steps.0.successCriteria.0.condition",
      "workflows.0.steps.0.outputs.bad",
    ]);
  });
});
