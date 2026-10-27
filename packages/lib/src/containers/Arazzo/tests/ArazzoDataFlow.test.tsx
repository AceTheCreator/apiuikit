import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Arazzo from "../Arazzo";

const petsApi = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1" },
  paths: {
    "/pets": { post: { operationId: "createPet", responses: { 201: { description: "Created" } } } },
    "/pets/{id}": {
      get: { operationId: "getPet", responses: { 200: { description: "OK" } } },
      delete: { operationId: "deletePet", responses: { 204: { description: "Gone" } } },
    },
  },
};

// Create a pet, read it back with the ID the first step produced, then
// delete it; one reference is broken.
const document = {
  arazzo: "1.0.1",
  info: { title: "Pet flows", version: "1.0.0" },
  sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }],
  workflows: [
    {
      workflowId: "adopt",
      summary: "Adopt a pet",
      inputs: { type: "object", properties: { name: { type: "string" } } },
      steps: [
        {
          stepId: "create",
          operationId: "createPet",
          requestBody: { contentType: "application/json", payload: '{ "name": "{$inputs.name}", "status": "new" }' },
          outputs: { petId: "$response.body#/id" },
        },
        {
          stepId: "read",
          operationId: "getPet",
          parameters: [{ name: "id", in: "path", value: "$steps.create.outputs.petId" }],
          successCriteria: [{ condition: "$statusCode == 200 && $steps.create.outputs.petId != null" }],
          outputs: { pet: "$response.body" },
        },
        {
          stepId: "remove",
          operationId: "deletePet",
          parameters: [
            { name: "id", in: "path", value: "$steps.create.outputs.petId" },
            { name: "X-Owner", in: "header", value: "$steps.read.outputs.owner" },
          ],
        },
      ],
      outputs: { pet: "$steps.read.outputs.pet" },
    },
  ],
};

const step = (id: string) => window.document.getElementById(`step-adopt/${id}`)!;
const chip = (container: HTMLElement, text: string) => within(container).getAllByRole("button", { name: text })[0];

const renderPage = async () => {
  const onDiagnostics = vi.fn();
  render(<Arazzo arazzo={document} sources={{ pets: petsApi }} onDiagnostics={onDiagnostics} />);
  await screen.findByRole("heading", { name: "Adopt a pet" }, { timeout: 5000 });
  return { onDiagnostics };
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Arazzo data flow", () => {
  it("shows expressions as chips of their kind, everywhere they're written", async () => {
    await renderPage();

    // A step output, read by a parameter and inside a condition.
    const read = step("read");
    const outputs = within(read).getAllByRole("button", { name: "$steps.create.outputs.petId" });
    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toHaveAttribute("data-expression-kind", "step-output");
    expect(outputs[0]).toHaveAttribute("title", 'Output "petId" of step create');
    // The current exchange isn't produced anywhere: a plain chip, not a button.
    const status = within(read).getByText("$statusCode");
    expect(status.tagName).toBe("CODE");
    expect(status).toHaveAttribute("data-expression-kind", "status-code");
    // Embedded in a text payload, in place, and the payload is still copyable as written.
    const create = step("create");
    expect(chip(create, "$inputs.name")).toHaveAttribute("data-expression-kind", "input");
    expect(create.querySelector("pre")).toHaveTextContent('{ "name": "{$inputs.name}", "status": "new" }');
    expect(within(create).getByRole("button", { name: "Copy request body" })).toBeInTheDocument();
  });

  it("goes to the step that produces a value", async () => {
    await renderPage();
    fireEvent.click(chip(step("read"), "$steps.create.outputs.petId"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect((vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0] as Element).id).toBe("step-adopt/create");
  });

  it("highlights the producer and every consumer while a chip is hovered or focused", async () => {
    await renderPage();
    const value = chip(step("read"), "$steps.create.outputs.petId");

    fireEvent.mouseEnter(value);
    expect(step("create")).toHaveAttribute("data-flow-role", "producer");
    expect(step("read")).toHaveAttribute("data-flow-role", "consumer");
    expect(step("remove")).toHaveAttribute("data-flow-role", "consumer");
    fireEvent.mouseLeave(value);
    expect(step("create")).not.toHaveAttribute("data-flow-role");

    // The keyboard gets the same.
    const pet = chip(screen.getByRole("region", { name: "Workflow adopt" }), "$steps.read.outputs.pet");
    fireEvent.focus(pet);
    expect(step("read")).toHaveAttribute("data-flow-role", "producer");
    expect(step("create")).not.toHaveAttribute("data-flow-role");
    fireEvent.blur(pet);
    expect(step("read")).not.toHaveAttribute("data-flow-role");
  });

  it("lists who uses each output and input", async () => {
    await renderPage();
    const created = within(step("create")).getByText("Used by").parentElement!;
    expect(within(created).getAllByRole("button").map((link) => link.textContent)).toEqual(["read", "remove"]);

    const read = within(step("read")).getByText("Used by").parentElement!;
    expect(within(read).getByRole("button", { name: "workflow outputs" })).toBeInTheDocument();

    const inputs = screen.getByRole("list", { name: "Where inputs are used" });
    expect(within(inputs).getByText("name")).toBeInTheDocument();
    expect(within(inputs).getByRole("button", { name: "create" })).toBeInTheDocument();
  });

  it("flags a reference to nothing, on the chip and in diagnostics", async () => {
    const { onDiagnostics } = await renderPage();
    const broken = chip(step("remove"), "$steps.read.outputs.owner");
    expect(broken).toHaveAttribute("title", 'Output "owner" of step read. Step "read" has no output "owner".');
    expect(broken.className).toMatch(/text-red-600/);
    await waitFor(() =>
      expect(onDiagnostics).toHaveBeenCalledWith([
        expect.objectContaining({ message: expect.stringContaining('Step "read" has no output "owner"'), path: ["workflows", "0", "steps", "2", "parameters", "1"] }),
      ]),
    );
  });
});
