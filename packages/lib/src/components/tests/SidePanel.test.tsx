import { fireEvent, render } from "@testing-library/react";
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

function contextValue(portalHost: HTMLElement): DocumentContextValue {
  return {
    specType: "openapi",
    document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {} },
    deref: () => undefined,
    portalHost,
    rootElement: null,
    sidePanelContainment: "viewport",
    depthColors: [],
    showExtensions: true,
    showCodeSamples: true,
  } as DocumentContextValue;
}

/** Fired at an element inside the panel rather than at `document` itself: a
 * capture listener on `document` only runs ahead of the panel's bubble
 * listener when the event has somewhere further to travel. An event targeting
 * `document` reaches both listeners regardless of phase, which would make the
 * capture-phase contract look broken when it isn't. */
function pressEscapeInside(portalHost: HTMLElement) {
  fireEvent.keyDown(portalHost.firstElementChild as HTMLElement, { key: "Escape" });
}


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
      resolvedMode: "light",      sidePanelTopOffset: 72,
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

  it("closes on Escape while open, and ignores it once closed", () => {
    const portalHost = mountElement();
    const onClose = vi.fn();

    const { rerender } = render(
      <DocumentContext.Provider value={contextValue(portalHost)}>
        <SidePanel isOpen side="right" title="Operation" onClose={onClose} />
      </DocumentContext.Provider>,
    );

    pressEscapeInside(portalHost);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <DocumentContext.Provider value={contextValue(portalHost)}>
        <SidePanel isOpen={false} side="right" title="Operation" onClose={onClose} />
      </DocumentContext.Provider>,
    );

    pressEscapeInside(portalHost);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves Escape to an overlay that claims it in the capture phase", () => {
    const portalHost = mountElement();
    const onClose = vi.fn();
    const onOverlayEscape = vi.fn();

    render(
      <DocumentContext.Provider value={contextValue(portalHost)}>
        <SidePanel isOpen side="right" title="Operation" onClose={onClose} />
      </DocumentContext.Provider>,
    );

    // How a plugin modal layered above the panel takes ownership of Escape —
    // the contract documented in docs/usage/plugins.md.
    const claimEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onOverlayEscape();
    };
    document.addEventListener("keydown", claimEscape, true);

    pressEscapeInside(portalHost);

    expect(onOverlayEscape).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    document.removeEventListener("keydown", claimEscape, true);
  });
});
