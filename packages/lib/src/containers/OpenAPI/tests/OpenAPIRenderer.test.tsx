import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpenAPIRenderer } from "../OpenAPIRenderer";
import exampleDoc from "../../../config/examples/openapi-petstore.json";

const raw = JSON.stringify(exampleDoc);

describe("OpenAPIRenderer", () => {
  it("parses the raw document asynchronously and renders it once resolved", async () => {
    render(<OpenAPIRenderer raw={raw} />);

    expect(await screen.findByRole("heading", { name: "Petstore API" })).toBeInTheDocument();
  });

  it("reports parser diagnostics once parsing completes", async () => {
    const onDiagnostics = vi.fn();
    render(<OpenAPIRenderer raw={raw} onDiagnostics={onDiagnostics} />);

    await screen.findByRole("heading", { name: "Petstore API" });

    expect(onDiagnostics).toHaveBeenCalledTimes(1);
    expect(Array.isArray(onDiagnostics.mock.calls[0][0])).toBe(true);
  });

  it("renders nothing for a document that fails to parse", async () => {
    const onDiagnostics = vi.fn();
    const { container } = render(
      <OpenAPIRenderer raw="not a valid openapi document" onDiagnostics={onDiagnostics} />,
    );

    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());

    expect(container).toBeEmptyDOMElement();
  });

  it("reports validation errors for a structurally invalid document", async () => {
    const onDiagnostics = vi.fn();
    const invalidDoc = JSON.stringify({ openapi: "3.0.3", info: { title: "Bad" } });
    render(<OpenAPIRenderer raw={invalidDoc} onDiagnostics={onDiagnostics} />);

    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    const diagnostics = onDiagnostics.mock.calls[0][0] as Array<{ severity: number }>;
    expect(diagnostics.some((d) => d.severity === 0)).toBe(true);
  });

  it("re-parses when raw changes and reflects the new document", async () => {
    const { rerender } = render(<OpenAPIRenderer raw={raw} />);
    await screen.findByRole("heading", { name: "Petstore API" });

    const updatedDoc = { ...exampleDoc, info: { ...exampleDoc.info, title: "Updated API" } };
    rerender(<OpenAPIRenderer raw={JSON.stringify(updatedDoc)} />);

    expect(await screen.findByRole("heading", { name: "Updated API" })).toBeInTheDocument();
  });

  it("parses YAML input", async () => {
    const yamlDoc = [
      "openapi: 3.0.3",
      "info:",
      "  title: YAML API",
      "  version: 1.0.0",
      "paths: {}",
    ].join("\n");

    render(<OpenAPIRenderer raw={yamlDoc} />);

    expect(await screen.findByRole("heading", { name: "YAML API" })).toBeInTheDocument();
  });
});
