import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidePanel } from "../SidePanel";
import { DocumentContext, type DocumentContextValue } from "../../contexts";

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

describe("SidePanel", () => {
  it("keeps a component-contained header below the host top offset", () => {
    const portalHost = mountElement();
    const rootElement = mountElement();
    rootElement.getBoundingClientRect = vi.fn(() =>
      DOMRect.fromRect({ x: 100, y: -120, width: 600, height: 1_020 }),
    );

    const contextValue = {
      specType: "openapi",
      document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {} },
      deref: () => undefined,
      portalHost,
      rootElement,
      sidePanelContainment: "component",
      sidePanelTopOffset: 72,
      depthColors: [],
      showExtensions: true,
      showCodeSamples: true,
    } as DocumentContextValue;

    render(
      <DocumentContext.Provider value={contextValue}>
        <SidePanel isOpen side="right" title="Operation" onClose={() => undefined} />
      </DocumentContext.Provider>,
    );

    const overlay = portalHost.firstElementChild as HTMLElement;
    expect(overlay.style.top).toBe("72px");
    expect(overlay.style.height).toBe(`${Math.min(window.innerHeight, 900) - 72}px`);
  });
});
