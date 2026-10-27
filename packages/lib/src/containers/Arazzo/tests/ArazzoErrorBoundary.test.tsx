import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Arazzo from "../Arazzo";

// A step whose embedded operation throws while rendering: the failure must
// stay inside that step, leaving the other steps and workflows on screen.
vi.mock("../StepOperation", () => ({
  default: ({ target }: { target: { operation: { operationId?: string } } }) => {
    if (target.operation.operationId === "explode") throw new Error("operation exploded");
    return <p>operation {target.operation.operationId}</p>;
  },
}));

const api = {
  openapi: "3.1.0",
  info: { title: "Api", version: "1" },
  paths: {
    "/ok": { get: { operationId: "fine", responses: { 200: { description: "OK" } } } },
    "/boom": { get: { operationId: "explode", responses: { 200: { description: "OK" } } } },
  },
};

const document = {
  arazzo: "1.0.1",
  info: { title: "Flows", version: "1" },
  sourceDescriptions: [{ name: "api", url: "./api.yaml", type: "openapi" }],
  workflows: [
    { workflowId: "first", summary: "First", steps: [{ stepId: "boom", operationId: "explode" }, { stepId: "ok", operationId: "fine" }] },
    { workflowId: "second", summary: "Second", steps: [{ stepId: "ok", operationId: "fine" }] },
  ],
};

describe("Arazzo error containment", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a failing step from taking down its workflow or the page", async () => {
    render(<Arazzo arazzo={document} sources={{ api }} />);
    await screen.findByRole("heading", { name: "Second" }, { timeout: 5000 });

    expect(screen.getByRole("alert")).toHaveTextContent("This step could not be rendered");
    expect(screen.getAllByText("operation fine")).toHaveLength(2);
  });
});
