import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchPanel from "../SearchPanel";
import { DocumentContext, type DocumentContextValue } from "../../contexts";
import type { SearchEntry } from "../../helpers/searchIndex";

// jsdom doesn't implement scrollIntoView — SearchPanel calls it on every
// active-result change, so it needs a stub to avoid crashing in effects.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

const mountedElements: HTMLElement[] = [];

function mountElement() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  mountedElements.push(element);
  return element;
}

afterEach(() => {
  mountedElements.splice(0).forEach((element) => element.remove());
});

function makeResult(id: string, name: string): SearchEntry {
  return {
    id,
    targetId: id,
    type: "schema",
    tab: "schemas",
    key: id,
    name,
    path: name,
    location: "Schemas",
    text: name,
  };
}

const results = [makeResult("a", "Alpha"), makeResult("b", "Beta"), makeResult("c", "Gamma")];

function renderSearchPanel() {
  const portalHost = mountElement();
  const rootElement = mountElement();

  const contextValue = {
    specType: "openapi",
    document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {} },
    deref: () => undefined,
    portalHost,
    rootElement,
    sidePanelContainment: "component",
    depthColors: [],
    showExtensions: true,
    showCodeSamples: true,
  } as DocumentContextValue;

  render(
    <DocumentContext.Provider value={contextValue}>
      <SearchPanel
        query="a"
        onQueryChange={() => undefined}
        results={results}
        onSelectResult={() => undefined}
      />
    </DocumentContext.Provider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  return screen.getByRole("combobox", { name: "Search document" });
}

describe("SearchPanel keyboard navigation", () => {
  it("stops at the first result on ArrowUp instead of wrapping to the last", () => {
    const input = renderSearchPanel();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /Beta/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true");

    // Already at the top — one more ArrowUp must stay put, not wrap to Gamma.
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true");
  });

  it("scrolls the newly active result into view as arrow keys move past it", () => {
    const input = renderSearchPanel();
    const scrollSpy = vi.fn();
    for (const option of screen.getAllByRole("option")) {
      option.scrollIntoView = scrollSpy;
    }

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });

    scrollSpy.mockClear();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
  });
});
