import petstore from "../config/examples/openapi-petstore.json";

/*
 * Small Arazzo documents for the stories, each calling the bundled Petstore
 * OpenAPI example (listPets, createPet, getPetById, deletePet). The official
 * OAI examples live with the test fixtures (helpers/tests/fixtures/arazzo).
 */

export const petstoreSource = petstore as unknown as Record<string, unknown>;

const info = (title: string, description: string) => ({ title, version: "1.0.0", description });

/** Two workflows: one creates a pet then reads it back, the other runs it and cleans up. */
export const adoptionFlows = {
  arazzo: "1.0.1",
  info: info("Pet adoption", "Workflows for adding a pet to the store and cleaning up after it."),
  sourceDescriptions: [{ name: "petstore", url: "./openapi-petstore.json", type: "openapi" }],
  workflows: [
    {
      workflowId: "add-pet",
      summary: "Add a pet and read it back",
      description: "Creates a pet, then fetches it by the ID the store assigned.",
      inputs: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "The pet's name." },
          tag: { type: "string", description: "An optional tag, such as the species." },
        },
      },
      steps: [
        {
          stepId: "create",
          description: "Create the pet.",
          operationId: "createPet",
          requestBody: { contentType: "application/json", payload: { name: "$inputs.name", tag: "$inputs.tag" } },
          successCriteria: [{ condition: "$statusCode == 201" }],
          outputs: { petId: "$response.body#/id" },
        },
        {
          stepId: "read-back",
          description: "Fetch the pet that was just created.",
          operationId: "getPetById",
          parameters: [{ name: "petId", in: "path", value: "$steps.create.outputs.petId" }],
          successCriteria: [{ condition: "$statusCode == 200" }, { context: "$response.body", type: "jsonpath", condition: "$[?(@.name)]" }],
          outputs: { pet: "$response.body" },
        },
      ],
      outputs: { petId: "$steps.create.outputs.petId", pet: "$steps.read-back.outputs.pet" },
    },
    {
      workflowId: "add-and-remove",
      summary: "Add a pet, then remove it",
      dependsOn: ["add-pet"],
      steps: [
        {
          stepId: "add",
          description: "Runs the add-pet workflow.",
          workflowId: "add-pet",
          parameters: [{ name: "name", value: "Rex" }],
          outputs: { petId: "$outputs.petId" },
        },
        {
          stepId: "remove",
          operationId: "$sourceDescriptions.petstore.deletePet",
          parameters: [{ name: "petId", in: "path", value: "$steps.add.outputs.petId" }],
          successCriteria: [{ condition: "$statusCode == 204" }],
        },
      ],
    },
  ],
};

/** Every action type, on success and on failure, with and without criteria. */
export const actionFlows = {
  arazzo: "1.0.1",
  info: info("Paging and retries", "Shows each kind of success and failure action."),
  sourceDescriptions: [{ name: "petstore", url: "./openapi-petstore.json", type: "openapi" }],
  workflows: [
    {
      workflowId: "list-all-pets",
      summary: "List every pet, page by page",
      inputs: { type: "object", properties: { pageSize: { type: "integer", default: 20 } } },
      parameters: [{ name: "X-Request-Source", in: "header", value: "arazzo-docs" }],
      steps: [
        {
          stepId: "page",
          operationId: "listPets",
          parameters: [{ name: "limit", in: "query", value: "$inputs.pageSize" }],
          successCriteria: [{ condition: "$statusCode == 200" }],
          onSuccess: [
            { name: "next-page", type: "goto", stepId: "page", criteria: [{ condition: "$response.header.x-next != null" }] },
            { name: "inspect-first", type: "goto", workflowId: "inspect", criteria: [{ context: "$response.body", type: "jsonpath", condition: "$[0]" }] },
            { name: "done", type: "end" },
          ],
          onFailure: [
            { name: "rate-limited", type: "retry", retryAfter: 2, retryLimit: 5, criteria: [{ condition: "$statusCode == 429" }] },
            { reference: "$components.failureActions.give-up" },
          ],
          outputs: { pets: "$response.body" },
        },
      ],
      failureActions: [{ name: "log", type: "end" }],
      outputs: { pets: "$steps.page.outputs.pets" },
    },
    {
      workflowId: "inspect",
      summary: "Inspect one pet",
      inputs: { type: "object", properties: { petId: { type: "integer" } } },
      steps: [
        {
          stepId: "fetch",
          operationId: "getPetById",
          parameters: [{ name: "petId", in: "path", value: "$inputs.petId" }],
        },
      ],
    },
  ],
  components: {
    failureActions: { "give-up": { name: "give-up", type: "end", criteria: [{ condition: "$statusCode >= 500" }] } },
  },
};

/** A second source that can't be loaded: its steps degrade, the rest renders. */
export const unresolvedSourceFlows = {
  arazzo: "1.0.1",
  info: info("Checkout", "Uses a payments API that isn't available to the page."),
  sourceDescriptions: [
    { name: "petstore", url: "./openapi-petstore.json", type: "openapi" },
    { name: "payments", url: "./payments.yaml", type: "openapi" },
  ],
  workflows: [
    {
      workflowId: "buy-pet",
      summary: "Buy a pet",
      inputs: { type: "object", properties: { petId: { type: "integer" } } },
      steps: [
        { stepId: "find", operationId: "getPetById", parameters: [{ name: "petId", in: "path", value: "$inputs.petId" }], outputs: { price: "$response.body#/price" } },
        { stepId: "pay", operationId: "$sourceDescriptions.payments.createCharge", requestBody: { payload: { amount: "$steps.find.outputs.price" } } },
        { stepId: "confirm", operationPath: "{$sourceDescriptions.payments.url}#/paths/~1charges~1{id}/get" },
      ],
    },
  ],
};

/**
 * Values passed from step to step: inputs, step outputs read by later steps
 * (in parameters, a templated header, a payload and conditions), workflow
 * outputs read by a workflow that runs it, and one broken reference.
 */
export const dataFlowFlows = {
  arazzo: "1.0.1",
  info: info("Adoption data flow", "Each value a step needs comes from the workflow's inputs or an earlier step. Point at an expression to see where its value comes from and where else it's used."),
  sourceDescriptions: [{ name: "petstore", url: "./openapi-petstore.json", type: "openapi" }],
  workflows: [
    {
      workflowId: "adopt",
      summary: "Adopt a pet",
      inputs: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "The pet's name." },
          tag: { type: "string", description: "The species." },
          pageSize: { type: "integer", default: 10 },
        },
      },
      steps: [
        {
          stepId: "list",
          description: "See what's already in the store.",
          operationId: "listPets",
          parameters: [{ name: "limit", in: "query", value: "$inputs.pageSize" }],
          successCriteria: [{ condition: "$statusCode == 200" }],
          outputs: { firstId: "$response.body#/0/id", next: "$response.header.x-next" },
        },
        {
          stepId: "create",
          description: "Add the new pet.",
          operationId: "createPet",
          requestBody: { contentType: "application/json", payload: { name: "$inputs.name", tag: "{$inputs.tag}-adopted" } },
          successCriteria: [{ condition: "$statusCode == 201" }],
          outputs: { petId: "$response.body#/id" },
        },
        {
          stepId: "read",
          description: "Read it back, checking the store kept its ID.",
          operationId: "getPetById",
          parameters: [
            { name: "petId", in: "path", value: "$steps.create.outputs.petId" },
            { name: "X-Previous", in: "header", value: "after-{$steps.list.outputs.firstId}" },
          ],
          successCriteria: [{ condition: "$statusCode == 200 && $response.body#/id == $steps.create.outputs.petId" }],
          outputs: { pet: "$response.body" },
        },
        {
          stepId: "cleanup",
          description: "Remove the pet again.",
          operationId: "deletePet",
          parameters: [{ name: "petId", in: "path", value: "$steps.create.outputs.petId" }],
          successCriteria: [{ condition: "$statusCode == 204" }],
          onSuccess: [{ name: "done", type: "end", criteria: [{ condition: "$steps.read.outputs.pet != null" }] }],
        },
      ],
      outputs: { petId: "$steps.create.outputs.petId", pet: "$steps.read.outputs.pet", previousFirst: "$steps.list.outputs.firstId" },
    },
    {
      workflowId: "report",
      summary: "Adopt, then report",
      steps: [
        { stepId: "adopt", workflowId: "adopt", parameters: [{ name: "name", value: "Rex" }], outputs: { petId: "$outputs.petId" } },
        {
          stepId: "fetch",
          operationId: "getPetById",
          parameters: [
            { name: "petId", in: "path", value: "$steps.adopt.outputs.petId" },
            // Broken on purpose: the adopt step has no `owner` output.
            { name: "X-Owner", in: "header", value: "$steps.adopt.outputs.owner" },
          ],
          outputs: { pet: "$response.body" },
        },
      ],
      outputs: { pet: "$steps.fetch.outputs.pet", adopted: "$workflows.adopt.outputs.pet" },
    },
  ],
};
