/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import AsyncAPI from "../AsyncAPI";
import type { AsyncAPIDocumentData } from "../../../types/schema";

const asDoc = (doc: unknown) => doc as AsyncAPIDocumentData;

// jsdom implements neither the CSS Custom Highlight API nor scrollIntoView,
// so highlightSearchMatch's feature-detection guard would skip the whole
// mechanism under test. Polyfill just enough of the real shape to exercise
// the actual TreeWalker/Range logic and inspect what gets registered.
//
// Vitest reuses the jsdom environment across files within a worker (it isn't
// per-file isolated by default), so these globals must be restored in
// afterAll — leaving them patched previously broke `document` itself for
// unrelated test files run later in the same worker.
class FakeHighlight {
  ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}
const originalHighlight = (globalThis as any).Highlight;
const originalHighlights = (globalThis as any).CSS?.highlights;
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
  (globalThis as any).Highlight = FakeHighlight;
  (globalThis as any).CSS.highlights = new Map<string, FakeHighlight>();
  Element.prototype.scrollIntoView = () => {};
});

afterAll(() => {
  (globalThis as any).Highlight = originalHighlight;
  (globalThis as any).CSS.highlights = originalHighlights;
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const highlightedText = () => {
  const registry = (globalThis as any).CSS.highlights as Map<string, FakeHighlight>;
  const h = registry.get("search-match");
  return h ? h.ranges.map((r) => r.toString()).join(" ") : "";
};

// One operation (so the default tab is Operations, matching the reported
// repro) plus a schema with a property nested two levels deep — "address" is
// not root-level, so it's genuinely gated behind its own collapse/expand,
// unlike a schema's immediate properties (whose row is always suppressed).
const doc = {
  asyncapi: "3.0.0",
  info: { title: "Debug", version: "1.0.0" },
  channels: { widgetChannel: { address: "widgets", messages: {} } },
  operations: {
    doSomething: { action: "send", channel: { $ref: "#/channels/widgetChannel" }, summary: "Sends a widget" },
  },
  components: {
    schemas: {
      Widget: {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: {
              zipcode: { type: "string", description: "The ZIPCODEMARKER value" },
            },
          },
        },
      },
    },
  },
};

describe("search result highlighting", () => {
  it("scrolls to and expands a nested schema property via search, without text-highlighting it (backlogged)", async () => {
    render(<AsyncAPI asyncapi={asDoc(doc)} />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search document" }), { target: { value: "ZIPCODEMARKER" } });
    fireEvent.click(await screen.findByText(/Widget/i, { selector: "div.text-sm.font-semibold" }));

    // Navigation + auto-expand still work: the matched node reaches the DOM.
    await waitFor(() => {
      const target = document.querySelector('[id^="schema-Widget-"]');
      expect(target?.textContent?.toLowerCase()).toContain("zipcodemarker");
    });
    // But the visual text highlight is intentionally skipped for schema
    // entries — text-highlighting across a Schemas tab switch isn't
    // reliable yet (backlogged); don't regress this back on by accident.
    await new Promise((r) => setTimeout(r, 700));
    expect(highlightedText()).toBe("");
  });

  it("still highlights operation/message/server results normally", async () => {
    render(<AsyncAPI asyncapi={asDoc(doc)} />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search document" }), { target: { value: "widget" } });
    fireEvent.click(await screen.findByText("doSomething", { selector: "div.text-sm.font-semibold" }));
    await waitFor(() => expect(highlightedText().toLowerCase()).toContain("widget"), { timeout: 2000 });
  });

  it("clears any prior highlight when a search result switches to Schemas", async () => {
    render(<AsyncAPI asyncapi={asDoc(doc)} />);

    // Step 1: highlight something on the default (Operations) tab.
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search document" }), { target: { value: "widget" } });
    fireEvent.click(await screen.findByText("doSomething", { selector: "div.text-sm.font-semibold" }));
    await waitFor(() => expect(highlightedText().toLowerCase()).toContain("widget"), { timeout: 2000 });

    // Step 2: a second search that switches to Schemas — should navigate
    // there and clear the stale Operations highlight, not show anything new.
    // Selecting the first result re-closes the modal, so it needs reopening.
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search document" }), { target: { value: "ZIPCODEMARKER" } });
    fireEvent.click(await screen.findByText(/Widget/i, { selector: "div.text-sm.font-semibold" }));
    await waitFor(() => {
      const target = document.querySelector('[id^="schema-Widget-"]');
      expect(target?.textContent?.toLowerCase()).toContain("zipcodemarker");
    });
    expect(highlightedText()).toBe("");
  });
});
