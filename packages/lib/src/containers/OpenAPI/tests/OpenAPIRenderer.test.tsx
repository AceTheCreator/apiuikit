import { fireEvent, render, screen } from "@testing-library/react";
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

  it("reports parse failures without rendering its own diagnostics", async () => {
    const onDiagnostics = vi.fn();
    render(
      <OpenAPIRenderer raw="not a valid openapi document" onDiagnostics={onDiagnostics} />,
    );

    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());

    expect(onDiagnostics.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("forwards initialLocation/onLocationChange to the parsed document once it mounts", async () => {
    const onLocationChange = vi.fn();
    render(
      <OpenAPIRenderer
        raw={raw}
        initialLocation={{ tab: "endpoints", key: "get /pets" }}
        onLocationChange={onLocationChange}
      />,
    );

    expect(await screen.findByText("List all pets")).toBeInTheDocument();
    expect(onLocationChange).toHaveBeenCalledWith({ tab: "endpoints", key: "get /pets" });
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
  it("renders endpoints alongside validation errors and recovers after an edit", async () => {
    const invalid = { ...exampleDoc, info: { title: "Partial API" } };
    const onDiagnostics = vi.fn();
    const { rerender } = render(<OpenAPIRenderer raw={JSON.stringify(invalid)} onDiagnostics={onDiagnostics} />);
    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    expect(onDiagnostics.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Partial API" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
    rerender(<OpenAPIRenderer raw={raw} onDiagnostics={onDiagnostics} />);
    expect(await screen.findByRole("heading", { name: "Petstore API" })).toBeInTheDocument();
    expect(onDiagnostics).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("allows consumers to display diagnostics themselves", async () => {
    const onDiagnostics = vi.fn();
    render(<OpenAPIRenderer raw="{" onDiagnostics={onDiagnostics} />);
    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("recovers from unreadable input when corrected", async () => {
    const onDiagnostics = vi.fn();
    const { rerender } = render(<OpenAPIRenderer raw="{" onDiagnostics={onDiagnostics} />);
    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    expect(onDiagnostics.mock.calls[0][0].length).toBeGreaterThan(0);
    rerender(<OpenAPIRenderer raw={raw} onDiagnostics={onDiagnostics} />);
    expect(await screen.findByRole("heading", { name: "Petstore API" })).toBeInTheDocument();
    expect(onDiagnostics).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps valid endpoints available when another operation has malformed parameters", async () => {
    const invalid = { ...exampleDoc, paths: {
      ...exampleDoc.paths,
      "/broken": { get: { summary: "Broken operation", parameters: [null], responses: {} } },
    } };
    render(<OpenAPIRenderer raw={JSON.stringify(invalid)} />);
    expect(await screen.findByRole("heading", { name: "Petstore API" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "GET /pets" }));
    expect(screen.getAllByText("List all pets").length).toBeGreaterThan(0);
  });

  it("renders endpoints when the info object is missing", async () => {
    const { info: _info, ...withoutInfo } = exampleDoc;
    render(<OpenAPIRenderer raw={JSON.stringify(withoutInfo)} />);
    expect(await screen.findByRole("button", { name: "GET /pets" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("contains an operation render failure and lets another operation open", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const invalid = { ...exampleDoc, paths: {
        ...exampleDoc.paths,
        "/broken": { get: { summary: "Broken", security: {}, responses: {} } },
      } };
      render(<OpenAPIRenderer raw={JSON.stringify(invalid)} />);
      fireEvent.click(await screen.findByRole("button", { name: "GET /broken" }));
      expect(await screen.findByText(/This operation could not be rendered/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "GET /pets" }));
      expect(screen.queryByText(/This operation could not be rendered/)).not.toBeInTheDocument();
      expect(screen.getAllByText("List all pets").length).toBeGreaterThan(0);
    } finally {
      consoleError.mockRestore();
    }
  });

});
