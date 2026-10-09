import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncAPIRenderer } from "../AsyncAPIRenderer";
import example from "../../../config/examples/example1.json";

// Force a render-time fault independently of any particular component's guards.
vi.mock("../../Operation/Operations", () => ({
  default: ({ operations }: { operations: Record<string, unknown> }) => {
    if (operations.broken) throw new Error("operation rendering failed");
    return <p>Usable operations</p>;
  },
}));

afterEach(() => vi.restoreAllMocks());

describe("AsyncAPI partial rendering safeguards", () => {
  it("contains a section crash, permits navigation and retries after correction", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onDiagnostics = vi.fn();
    const invalid = { ...example, operations: { ...example.operations,
      broken: { action: "invalid", channel: { $ref: "#/channels/absent" } },
    } };
    const { rerender } = render(<AsyncAPIRenderer raw={JSON.stringify(invalid)} onDiagnostics={onDiagnostics} />);
    expect(await screen.findByText(/This section could not be rendered/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Streetlights Kafka API" })).toBeInTheDocument();
    expect(onDiagnostics.mock.calls[0][0]).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 0 })]));
    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    expect(screen.queryByText(/This section could not be rendered/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Operations" }));
    expect(screen.getByText(/This section could not be rendered/)).toBeInTheDocument();
    rerender(<AsyncAPIRenderer raw={JSON.stringify(example)} onDiagnostics={onDiagnostics} />);
    expect(await screen.findByText("Usable operations")).toBeInTheDocument();
    expect(screen.queryByText(/This section could not be rendered/)).not.toBeInTheDocument();
  });
});
