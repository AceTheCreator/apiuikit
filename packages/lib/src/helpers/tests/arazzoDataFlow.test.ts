import { describe, expect, it } from "vitest";
import { parseArazzoDocument, resolveArazzoDocument } from "../arazzoModel";
import { dataFlowKey, inputUses, stepSites } from "../arazzoDataFlow";
import type { ArazzoExpression, ArazzoModel, ArazzoStep } from "../../types/arazzo";
import { bnpl, petCoupons } from "./fixtures/arazzo";

const petsApi = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1" },
  paths: {
    "/pets": { get: { operationId: "listPets", responses: { 200: { description: "OK" } } } },
    "/pets/{id}": { get: { operationId: "getPet", responses: { 200: { description: "OK" } } } },
  },
};

const resolve = async (workflows: unknown[], fields: Record<string, unknown> = {}) => {
  const result = await resolveArazzoDocument(
    {
      arazzo: "1.0.1",
      info: { title: "Flows", version: "1.0.0" },
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }],
      workflows,
      ...fields,
    },
    { sources: { pets: petsApi } },
  );
  return { ...result, model: result.model! };
};

/** The expressions a step reads, by their text. */
const expressionsOf = (step: ArazzoStep): Record<string, ArazzoExpression> =>
  Object.fromEntries(stepSites(step).map(({ expression }) => [expression.text, expression]));

/** Who reads a value, as `workflow/step` (or `workflow` for the workflow itself). */
const readers = (model: ArazzoModel, valueKey: string) =>
  (model.consumers[valueKey] ?? []).map((use) => (use.stepId === undefined ? use.workflowId : `${use.workflowId}/${use.stepId}`));

describe("what an expression reads", () => {
  it("links inputs, step outputs and workflow outputs to where they're defined", async () => {
    const { model, diagnostics } = await resolve([
      {
        workflowId: "main",
        inputs: { type: "object", properties: { petId: { type: "string" } } },
        steps: [
          { stepId: "find", operationId: "getPet", parameters: [{ name: "id", in: "path", value: "$inputs.petId" }], outputs: { pet: "$response.body" } },
          {
            stepId: "check",
            operationId: "listPets",
            parameters: [{ name: "Authorization", in: "header", value: "Bearer {$steps.find.outputs.pet#/token}" }],
            successCriteria: [{ condition: "$statusCode == 200 && $steps.find.outputs.pet != null" }],
          },
          { stepId: "sub", workflowId: "child", outputs: { done: "$outputs.result" } },
        ],
        outputs: { pet: "$steps.find.outputs.pet", other: "$workflows.child.outputs.result" },
      },
      { workflowId: "child", steps: [{ stepId: "only", operationId: "listPets", outputs: { r: "$response.body" } }], outputs: { result: "$steps.only.outputs.r" } },
    ]);

    expect(diagnostics).toEqual([]);
    const [find, check, sub] = model.workflows[0].steps;
    expect(expressionsOf(find)["$inputs.petId"].target).toEqual({
      kind: "input",
      description: 'Input "petId" of workflow main',
      valueKey: dataFlowKey.input("main", "petId"),
      linkKey: "main",
      problem: undefined,
    });
    expect(expressionsOf(find)["$response.body"].target).toEqual({ kind: "response", description: "From this step's response" });
    // Embedded in a template, and read by a condition.
    expect(stepSites(check).map(({ field, expression }) => [field, expression.target?.kind, expression.target?.linkKey])).toEqual([
      ["parameters", "step-output", "main/find"],
      ["successCriteria", "status-code", undefined],
      ["successCriteria", "step-output", "main/find"],
    ]);
    // In a step that runs a workflow, `$outputs` is that workflow's outputs.
    expect(expressionsOf(sub)["$outputs.result"].target).toMatchObject({ kind: "workflow-output", valueKey: dataFlowKey.workflowOutput("child", "result"), linkKey: "child" });

    expect(readers(model, dataFlowKey.stepOutput("main", "find", "pet"))).toEqual(["main/check", "main/check", "main"]);
    expect(readers(model, dataFlowKey.workflowOutput("child", "result"))).toEqual(["main/sub", "main"]);
    expect(readers(model, dataFlowKey.stepOutput("child", "only", "r"))).toEqual(["child"]);
  });

  it("names sources, components and steps of other workflows", async () => {
    const { model } = await resolve(
      [
        {
          workflowId: "main",
          steps: [
            {
              stepId: "s",
              operationId: "listPets",
              parameters: [
                { name: "a", in: "query", value: "$sourceDescriptions.pets.url" },
                { name: "b", in: "query", value: "$components.parameters.page" },
                { name: "c", in: "query", value: "$workflows.main.steps.s" },
              ],
            },
          ],
        },
      ],
      { components: { parameters: { page: { name: "page", in: "query", value: 1 } } } },
    );
    const expressions = expressionsOf(model.workflows[0].steps[0]);
    expect(expressions["$sourceDescriptions.pets.url"].target).toMatchObject({ kind: "source", sourceName: "pets", problem: undefined });
    expect(expressions["$components.parameters.page"].target).toMatchObject({ kind: "component", problem: undefined });
    expect(expressions["$workflows.main.steps.s"].target).toMatchObject({ kind: "step", linkKey: "main/s", problem: undefined });
  });

  it("leaves expressions that don't parse without a target", async () => {
    const { model } = await resolve([{ workflowId: "main", steps: [{ stepId: "s", operationId: "listPets", outputs: { bad: "$steps.s.token" } }] }]);
    expect(expressionsOf(model.workflows[0].steps[0])["$steps.s.token"]).toEqual({ text: "$steps.s.token", node: null });
  });
});

describe("dangling references", () => {
  it("are flagged on the expression and reported once each", async () => {
    const { model, diagnostics, status } = await resolve(
      [
        {
          workflowId: "main",
          inputs: { type: "object", properties: { petId: { type: "string" } } },
          // A workflow parameter is sent by every step, but reported once.
          parameters: [{ name: "X-Pet", in: "header", value: "$inputs.missing" }],
          steps: [
            {
              stepId: "a",
              operationId: "listPets",
              parameters: [
                { name: "p", in: "query", value: "$steps.nope.outputs.x" },
                { name: "q", in: "query", value: "$steps.a.outputs.nothing" },
                { name: "r", in: "query", value: "$workflows.ghost.outputs.x" },
                { name: "s", in: "query", value: "$sourceDescriptions.elsewhere.url" },
                { name: "t", in: "query", value: "$components.parameters.gone" },
              ],
            },
            { stepId: "b", operationId: "listPets" },
          ],
        },
        { workflowId: "bare", steps: [{ stepId: "c", operationId: "listPets", parameters: [{ name: "id", in: "query", value: "$inputs.id" }] }] },
      ],
    );

    expect(status).toBe("partial");
    expect(diagnostics.map(({ message, path, severity }) => [severity, path.join("."), message])).toEqual([
      [1, "workflows.0.parameters.0", '$inputs.missing: Workflow "main" has no input "missing".'],
      [0, "workflows.0.steps.0.parameters.0", '$steps.nope.outputs.x: There is no step "nope" in workflow "main".'],
      [0, "workflows.0.steps.0.parameters.1", '$steps.a.outputs.nothing: Step "a" has no output "nothing".'],
      [0, "workflows.0.steps.0.parameters.2", '$workflows.ghost.outputs.x: There is no workflow "ghost" in this document.'],
      [0, "workflows.0.steps.0.parameters.3", '$sourceDescriptions.elsewhere.url: There is no source description "elsewhere".'],
      [0, "workflows.0.steps.0.parameters.4", "$components.parameters.gone: There is no \"gone\" in components.parameters."],
      [1, "workflows.1.steps.0.parameters.0", '$inputs.id: Workflow "bare" declares no inputs.'],
    ]);
    const a = expressionsOf(model.workflows[0].steps[0]);
    // A missing output still links to its step; a missing step links nowhere.
    expect(a["$steps.a.outputs.nothing"].target).toMatchObject({ linkKey: "main/a", problem: 'Step "a" has no output "nothing".' });
    expect(a["$steps.nope.outputs.x"].target?.linkKey).toBeUndefined();
  });

  it("allows inputs a schema doesn't rule out", async () => {
    const { diagnostics } = await resolve([
      {
        workflowId: "main",
        inputs: { type: "object", properties: { a: { type: "string" } }, additionalProperties: true },
        steps: [{ stepId: "s", operationId: "listPets", parameters: [{ name: "b", in: "query", value: "$inputs.b" }] }],
      },
      {
        workflowId: "composed",
        inputs: { allOf: [{ type: "object" }] },
        steps: [{ stepId: "s", operationId: "listPets", parameters: [{ name: "b", in: "query", value: "$inputs.b" }] }],
      },
    ]);
    expect(diagnostics).toEqual([]);
  });

  it("treats the rest of a name as a field inside a declared output or input", async () => {
    const { model, diagnostics } = await resolve([
      {
        workflowId: "main",
        inputs: { type: "object", properties: { user: { type: "object" }, "a.b": { type: "string" } } },
        steps: [
          { stepId: "create", operationId: "listPets", outputs: { created: "$response.body" } },
          {
            stepId: "use",
            operationId: "getPet",
            parameters: [
              { name: "id", in: "path", value: "$steps.create.outputs.created.projectId" },
              { name: "u", in: "query", value: "$inputs.user.name" },
              { name: "d", in: "query", value: "$inputs.a.b" },
              { name: "x", in: "query", value: "$steps.create.outputs.createdAt" },
            ],
          },
        ],
      },
    ]);
    const use = expressionsOf(model.workflows[0].steps[1]);
    expect(use["$steps.create.outputs.created.projectId"].target?.problem).toBeUndefined();
    expect(use["$inputs.user.name"].target?.problem).toBeUndefined();
    // A name with a dot that is declared as-is wins over a shorter one.
    expect(use["$inputs.a.b"].target?.valueKey).toBe(dataFlowKey.input("main", "a.b"));
    // Only whole names before a "." count: `createdAt` doesn't read `created`.
    expect(use["$steps.create.outputs.createdAt"].target?.problem).toBe('Step "create" has no output "createdAt".');
    expect(diagnostics.map((item) => item.message)).toEqual(['$steps.create.outputs.createdAt: Step "create" has no output "createdAt".']);
    expect(readers(model, dataFlowKey.stepOutput("main", "create", "created"))).toEqual(["main/use"]);
    expect(readers(model, dataFlowKey.input("main", "user"))).toEqual(["main/use"]);
  });

  it("are found in the official BNPL example", async () => {
    const { model } = await parseArazzoDocument(bnpl.arazzo, { sources: bnpl.sources });
    const steps = model!.workflows[0].steps;
    const authorize = steps.find((step) => step.stepId === "authenticateCustomerAndAuthorizeLoan")!;
    expect(expressionsOf(authorize)["$steps.authenticateCustomerAndAuthorizeLoan.outputs.redirectAuthToken"].target?.problem).toBe(
      'Step "authenticateCustomerAndAuthorizeLoan" has no output "redirectAuthToken".',
    );
  });
});

describe("who reads each value, in the official pet-coupons example", () => {
  it("lists the readers of each step output and input", async () => {
    const { model, diagnostics } = await parseArazzoDocument(petCoupons.arazzo, { sources: petCoupons.sources });
    expect(diagnostics).toEqual([]);

    expect(readers(model!, dataFlowKey.stepOutput("apply-coupon", "find-pet", "my_pet_id"))).toEqual(["apply-coupon/find-coupons", "apply-coupon/place-order"]);
    expect(readers(model!, dataFlowKey.stepOutput("apply-coupon", "find-coupons", "my_coupon_code"))).toEqual(["apply-coupon/place-order"]);
    expect(readers(model!, dataFlowKey.stepOutput("apply-coupon", "place-order", "my_order_id"))).toEqual(["apply-coupon"]);
    // Two workflows run place-order, and read its output.
    expect(readers(model!, dataFlowKey.workflowOutput("place-order", "workflow_order_id"))).toEqual(["apply-coupon/place-order", "buy-available-pet/place-order"]);

    expect(inputUses(model!, "place-order").map(({ name, uses }) => [name, uses.map((use) => use.stepId)])).toEqual([
      ["pet_id", ["place-order"]],
      ["quantity", ["place-order"]],
      ["coupon_code", ["place-order"]],
    ]);
  });
});
