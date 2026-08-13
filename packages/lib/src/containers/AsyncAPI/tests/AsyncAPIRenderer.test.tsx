import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AsyncAPIRenderer } from "../AsyncAPIRenderer";
import exampleDoc from "../../../config/examples/example1.json";
import avroDoc from "../../../config/examples/avro-streetlight.json";

const raw = JSON.stringify(exampleDoc);

describe("AsyncAPIRenderer", () => {
  it("parses the raw document asynchronously and renders it once resolved", async () => {
    render(<AsyncAPIRenderer raw={raw} />);

    // Nothing is rendered synchronously — parsing is async, so use findBy* to wait for it.
    expect(await screen.findByRole("heading", { name: "Streetlights Kafka API" })).toBeInTheDocument();
  });

  it("reports parser diagnostics once parsing completes", async () => {
    const onDiagnostics = vi.fn();
    render(<AsyncAPIRenderer raw={raw} onDiagnostics={onDiagnostics} />);

    await screen.findByRole("heading", { name: "Streetlights Kafka API" });

    expect(onDiagnostics).toHaveBeenCalledTimes(1);
    expect(Array.isArray(onDiagnostics.mock.calls[0][0])).toBe(true);
  });

  it("renders nothing for a document that fails to parse", async () => {
    const onDiagnostics = vi.fn();
    const { container } = render(<AsyncAPIRenderer raw="not a valid asyncapi document" onDiagnostics={onDiagnostics} />);

    await vi.waitFor(() => expect(onDiagnostics).toHaveBeenCalled());

    expect(container).toBeEmptyDOMElement();
  });

  it("converts Avro payloads during parsing (browser-safe) and renders record fields", async () => {
    const onDiagnostics = vi.fn();
    render(
      <AsyncAPIRenderer raw={JSON.stringify(avroDoc)} onDiagnostics={onDiagnostics} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Streetlights Avro API" }),
    ).toBeInTheDocument();

    // jsdom has `window`, so this exercises the same code path as a real
    // browser — where Avro payloads used to fail with "Unknown schema format".
    const diagnostics = onDiagnostics.mock.calls.flatMap((call) => call[0]);
    expect(
      diagnostics.some((diagnostic: { message?: unknown }) =>
        String(diagnostic.message).includes("Unknown schema format"),
      ),
    ).toBe(false);

    // The Avro record in components.schemas renders as a browsable tree.
    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const schemasPanel = within(document.getElementById("panel-schemas")!);
    expect(schemasPanel.getByText("tags[]")).toBeInTheDocument();
    expect(schemasPanel.getByText("avro 1.9.0")).toBeInTheDocument();
  });

  it("renders info.x-logo once in the top-left masthead", async () => {
    render(<AsyncAPIRenderer raw={raw} />);
    await screen.findByRole("heading", { name: "Streetlights Kafka API" });

    const infoPanel = document.getElementById("info-panel")!;
    expect(within(infoPanel).queryByRole("img", { name: "logo" })).not.toBeInTheDocument();

    const masthead = screen.getByLabelText("Document toolbar");
    const logo = await within(masthead).findByRole("img", { name: "logo" });
    expect(logo).toHaveAttribute(
      "src",
      "https://cdn.prod.website-files.com/60e49b51af3305d435c286ab/60e78065113f2f12904a43b1_aklivity-logo.svg",
    );
    expect(screen.getAllByRole("img", { name: "logo" })).toHaveLength(1);
    expect(masthead).toHaveStyle({ left: "16px", right: "16px" });
    expect(masthead.firstElementChild).toHaveClass(
      "@lg:max-w-[calc(70ch+28rem)]",
    );
    const search = within(masthead).getByRole("button", { name: "Search" });
    const copyMarkdown = within(masthead).getByRole("button", {
      name: "Copy as Markdown",
    });
    expect(
      search.compareDocumentPosition(copyMarkdown) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("re-parses when raw changes and reflects the new document", async () => {
    const { rerender } = render(<AsyncAPIRenderer raw={raw} />);
    await screen.findByRole("heading", { name: "Streetlights Kafka API" });

    const updatedRaw = JSON.stringify({
      ...exampleDoc,
      info: { ...exampleDoc.info, title: "Updated API" },
    });
    rerender(<AsyncAPIRenderer raw={updatedRaw} />);

    expect(await screen.findByRole("heading", { name: "Updated API" })).toBeInTheDocument();
  });
});
