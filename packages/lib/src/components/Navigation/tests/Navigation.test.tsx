import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentContext, type DocumentContextValue } from "../../../contexts";
import Navigation, { defineNavSection } from "../Navigation";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  const root = document.createElement("div");
  const portalHost = document.createElement("div");
  document.body.append(root, portalHost);
  const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return DOMRect.fromRect(this === root
      ? { x: 0, y: 0, width: 1600, height: 1000 }
      : { x: 200, y: 0, width: 1200, height: 0 });
  });
  const context = {
    specType: "openapi",
    document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {} },
    deref: () => undefined,
    rootElement: root, portalHost, topOffset: 0,
    sidePanelContainment: "viewport", resolvedMode: "light", depthColors: [],
    showExtensions: true, showCodeSamples: true,
  } as DocumentContextValue;
  const result = render(
    <DocumentContext.Provider value={context}>
      <Navigation
        sections={[defineNavSection({
          id: "operations", label: "Operations", icon: () => null,
          items: ["Read pets"], itemKey: (item) => item,
          targetId: () => "pet-operation", renderItem: (item) => item,
        })]}
        activeSection="operations" onTabChange={() => {}} onItemSelect={() => {}}
      />
    </DocumentContext.Provider>,
  );
  return { ...result, root, portalHost, rectSpy, dispose: () => { result.unmount(); root.remove(); portalHost.remove(); } };
}

it("hides closed destinations from accessible navigation and restores focus on Escape", () => {
  const view = setup();
  try {
    expect(screen.queryByRole("button", { name: "Read pets" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const destination = screen.getByRole("button", { name: "Read pets" });
    destination.focus();
    expect(destination).toBeVisible();
    fireEvent.keyDown(destination, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Read pets" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveFocus();
  } finally { view.dispose(); }
});

it("does not remeasure the content column while scrolling", () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const view = setup();
  try {
    view.rectSpy.mockClear();
    fireEvent.scroll(window);
    act(() => { frames.splice(0).forEach((callback) => callback(0)); });
    expect(view.rectSpy.mock.instances).toEqual([view.root]);
  } finally { view.dispose(); }
});
