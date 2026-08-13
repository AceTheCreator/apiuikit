import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AsyncAPI from "../AsyncAPI";
import type { AsyncAPIDocumentData } from "../../../types/schema";
import exampleDoc from "../../../config/examples/example1.json";
import avroDoc from "../../../config/examples/avro-streetlight.json";

const asDoc = (doc: unknown) => doc as AsyncAPIDocumentData;

describe("AsyncAPI", () => {
  it("renders the document title and resolves $refs into the operations list", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);

    expect(screen.getByRole("heading", { name: "Streetlights Kafka API" })).toBeInTheDocument();

    // The "turnOn" operation only carries a `channel: { $ref: "#/channels/lightTurnOn" }` —
    // seeing the resolved address (not a raw "$ref" string) proves resolveDocument ran end-to-end.
    // ChannelAddress splits the address across sibling spans at each {param} boundary, so a
    // single getByText regex can't match it — check the rendered text as a whole instead.
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).toContain("smartylighting.streetlights.1.0.action.");
    expect(bodyText).toContain(".turn.on");
    expect(bodyText).not.toContain("$ref");
  });

  it("hides the servers section when show.servers is false", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ show: { servers: false } }} />);

    expect(screen.queryByText("test.mykafkacluster.org", { exact: false })).not.toBeInTheDocument();
  });

  it("hides the search panel when show.search is false", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ show: { search: false } }} />);

    expect(screen.queryByPlaceholderText("Search document...")).not.toBeInTheDocument();
  });

  it("keeps search available when the sidebar is hidden", () => {
    const { container } = render(
      <AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ show: { sidebar: false } }} />,
    );

    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    const widgetRoot = container.firstElementChild as HTMLElement;
    expect(widgetRoot).not.toHaveClass("pt-14");
    expect(widgetRoot.children[1]).toHaveClass("pt-14");
  });

  it("does not reserve the content-bar row when no content tabs are visible", () => {
    const { container } = render(
      <AsyncAPI
        asyncapi={asDoc(exampleDoc)}
        config={{ show: { operations: false, messages: false, schemas: false } }}
      />,
    );

    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "AsyncAPI sections" })).not.toBeInTheDocument();
    const widgetRoot = container.firstElementChild as HTMLElement;
    expect(widgetRoot).not.toHaveClass("pt-14");
    expect(widgetRoot.children[1]).not.toHaveClass("pt-14");
  });

  it("moves the complete document toolbar as one unit while scrolling", async () => {
    const { container } = render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);
    const widgetRoot = container.firstElementChild as HTMLElement;
    const toolbar = screen.getByLabelText("Document toolbar");
    let top = 0;

    vi.spyOn(widgetRoot, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          x: 100,
          y: top,
          top,
          left: 100,
          right: 700,
          bottom: top + 1000,
          width: 600,
          height: 1000,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    top = -20;
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(toolbar).toHaveStyle({ position: "fixed", transform: "translateY(-150%)" });
    });
    expect(toolbar.querySelector(".document-logo")).not.toBeNull();
    expect(within(toolbar).getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Copy as Markdown" }),
    ).toBeInTheDocument();

    top = -10;
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(toolbar).toHaveStyle({ position: "fixed", transform: "translateY(0px)" });
    });
  });

  it("applies the host top offset to the sticky content tabs", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ topOffset: 64 }} />);

    const tabBar = screen
      .getByRole("tablist", { name: "AsyncAPI sections" })
      .closest(".sticky") as HTMLElement;
    expect(tabBar.style.top).toBe("64px");
  });

  it("opens the search modal via Ctrl+K/Cmd+K when the widget is hovered", () => {
    const { container } = render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);
    expect(screen.queryByRole("combobox", { name: "Search document" })).not.toBeInTheDocument();

    // Most of the widget's content (headings, table rows, schema trees) isn't
    // a focusable element, so hovering — not DOM focus — is the realistic
    // "user is engaged with this widget" signal for a plain mouse-over.
    const widgetRoot = container.firstElementChild as Element;
    fireEvent.mouseEnter(widgetRoot);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("combobox", { name: "Search document" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("combobox", { name: "Search document" })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("combobox", { name: "Search document" })).toBeInTheDocument();
  });

  it("opens the search modal via Ctrl+K when the last click landed inside the widget", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);

    const heading = screen.getByRole("heading", { name: "Streetlights Kafka API" });
    fireEvent.mouseDown(heading);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("combobox", { name: "Search document" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // A subsequent click outside the widget flips the "last click" signal —
    // Ctrl+K should stop firing until the widget is interacted with again.
    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("combobox", { name: "Search document" })).not.toBeInTheDocument();
  });

  it("ignores Ctrl+K/Cmd+K when the widget is neither hovered, clicked, nor focused", () => {
    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("combobox", { name: "Search document" })).not.toBeInTheDocument();
  });

  it("applies an expand.schemas config change to already-mounted schema trees", () => {
    // Minimal doc with a nested object property — `source` only renders while its
    // parent `metadata` node is expanded, which is what expand.schemas controls.
    const nestedDoc = {
      asyncapi: "3.0.0",
      info: { title: "Nested", version: "1.0.0" },
      components: {
        schemas: {
          widget: {
            type: "object",
            properties: {
              metadata: {
                type: "object",
                properties: { source: { type: "string" } },
              },
            },
          },
        },
      },
    };

    const { rerender } = render(
      <AsyncAPI asyncapi={asDoc(nestedDoc)} config={{ expand: { schemas: false } }} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const panel = () => within(document.getElementById("panel-schemas")!);
    expect(panel().getByText("metadata")).toBeInTheDocument();
    expect(panel().queryByText("source")).not.toBeInTheDocument();

    rerender(<AsyncAPI asyncapi={asDoc(nestedDoc)} config={{ expand: { schemas: true } }} />);
    expect(panel().getByText("source")).toBeInTheDocument();

    rerender(<AsyncAPI asyncapi={asDoc(nestedDoc)} config={{ expand: { schemas: false } }} />);
    expect(panel().queryByText("source")).not.toBeInTheDocument();
  });

  it("converts Avro multi-format payloads at render time (without parser)", () => {
    render(<AsyncAPI asyncapi={asDoc(avroDoc)} />);

    expect(
      screen.getByRole("heading", { name: "Streetlights Avro API" }),
    ).toBeInTheDocument();

    // The message payload is a raw Avro record inside a { schemaFormat,
    // schema } wrapper — no parser ran, so the lib converts it when rendering.
    fireEvent.click(screen.getByRole("tab", { name: "Messages" }));
    const messagesPanel = within(document.getElementById("panel-messages")!);
    fireEvent.click(messagesPanel.getByRole("button", { name: /show more/i }));
    expect(messagesPanel.getByText("avro 1.9.0")).toBeInTheDocument();

    // Example is the default schema tab, but its generated sample renders
    // asynchronously (json-schema-faker); switch to Schema for the converted
    // tree, which renders synchronously.
    fireEvent.click(messagesPanel.getByRole("tab", { name: "Schema" }));
    expect(messagesPanel.getByText("streetlightId")).toBeInTheDocument();

    // components.schemas entries in wrappers convert too.
    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const schemasPanel = within(document.getElementById("panel-schemas")!);
    expect(schemasPanel.getByText("tags[]")).toBeInTheDocument();
  });

  it("fails soft when an Avro schema is malformed", () => {
    const doc = {
      asyncapi: "3.0.0",
      info: { title: "Broken Avro", version: "1.0.0" },
      components: {
        schemas: {
          broken: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: { type: "record", name: "Broken" }, // record without fields
          },
        },
      },
    };

    render(<AsyncAPI asyncapi={asDoc(doc)} />);

    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    expect(
      screen.getByText(/Could not convert Avro schema/),
    ).toBeInTheDocument();
  });

  it("switches away from the active tab when a config change hides it", () => {
    const { rerender } = render(<AsyncAPI asyncapi={asDoc(exampleDoc)} />);

    expect(document.getElementById("panel-operations")).not.toBeNull();

    rerender(<AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ show: { operations: false } }} />);
    expect(document.getElementById("panel-operations")).toBeNull();
    expect(document.getElementById("panel-messages")).not.toBeNull();
  });

  it('self-heals when kind="resolved" is passed a document that still has $refs, and warns about the false promise', () => {
    // The "resolved" promise is verified, not trusted: resolveDocument's
    // ref scan catches the leftover $ref and inlines it anyway, and the
    // caller gets told their upstream resolution isn't doing what they think.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<AsyncAPI kind="resolved" asyncapi={asDoc(exampleDoc)} />);

      const bodyText = document.body.textContent ?? "";
      expect(bodyText).toContain("smartylighting.streetlights.1.0.action.");
      expect(bodyText).not.toContain("$ref");
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/kind="resolved".*still contains \$ref/));
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn for kind="resolved" parser output whose only quirk is object cycles', () => {
    const schema: Record<string, unknown> = { type: "object" };
    schema.properties = { self: schema };
    const doc = {
      asyncapi: "3.0.0",
      info: { title: "Cyclic API", version: "1.0.0" },
      components: { schemas: { schema } },
    };

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<AsyncAPI kind="resolved" asyncapi={asDoc(doc)} />);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("renders recursive $ref schemas as a circular row instead of crashing", () => {
    const doc = {
      asyncapi: "3.0.0",
      info: { title: "Recursive API", version: "1.0.0" },
      components: {
        schemas: {
          treeNode: {
            type: "object",
            properties: {
              value: { type: "string" },
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/treeNode" },
              },
            },
          },
        },
      },
    };

    // expand.schemas auto-expands every node — before upfront resolution and
    // ancestor tracking, this unrolled the self-reference forever.
    render(
      <AsyncAPI asyncapi={asDoc(doc)} config={{ expand: { schemas: true } }} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const schemasPanel = within(document.getElementById("panel-schemas")!);

    expect(schemasPanel.getByText("value")).toBeInTheDocument();
    expect(schemasPanel.getByText(/↩/)).toBeInTheDocument();
  });

  it("links \"View as Markdown\" at a hosted URL given as a plain string in config", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });

    render(<AsyncAPI asyncapi={asDoc(exampleDoc)} config={{ markdown: { url: "/docs/streetlights.md" } }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    expect(open).toHaveBeenCalledWith("/docs/streetlights.md", "_blank");
    expect(createObjectURL).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
