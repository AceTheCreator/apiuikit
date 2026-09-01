import { render, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentTopBar from "../DocumentTopBar";
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
  vi.restoreAllMocks();
});

/**
 * The bar's mode is derived from the widget root's own rect, not its own — a
 * root above the viewport top means the page has scrolled past the masthead.
 */
function mountRoot(tops: number[]) {
  const rootElement = mountElement();
  let call = 0;
  rootElement.getBoundingClientRect = vi.fn(() => {
    const y = tops[Math.min(call++, tops.length - 1)];
    return DOMRect.fromRect({ x: 0, y, width: 800, height: 2_000 });
  });
  return rootElement;
}

function renderTopBar(rootElement: HTMLElement, topOffset?: number) {
  const contextValue = {
    specType: "openapi",
    document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {} },
    deref: () => undefined,
    portalHost: null,
    rootElement,
    topOffset,
    sidePanelContainment: "component",
    depthColors: [],
    showExtensions: true,
    showCodeSamples: true,
  } as DocumentContextValue;

  const { container } = render(
    <DocumentContext.Provider value={contextValue}>
      <DocumentTopBar logo={<span>Logo</span>} />
    </DocumentContext.Provider>,
  );
  return container.querySelector("header") as HTMLElement;
}

/** Scrolling down past the top of the widget is what sends the bar into "hidden". */
function scrollDown() {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
  act(() => {
    vi.runAllTimers();
  });
}

/** The bar's height in the stylesheet, and so the basis a `%` transform resolves against. */
const BAR_HEIGHT = 40;

/**
 * How far up the bar actually travels, in pixels. Resolves a percentage the
 * way the browser would — against the element's own height — so the assertion
 * measures where the bar ends up rather than how the offset was spelled.
 */
function travelPx(transform: string): number {
  const [, value, unit] = transform.match(/translateY\(-?([\d.]+)(px|%)\)/)!;
  return unit === "%" ? (Number(value) / 100) * BAR_HEIGHT : Number(value);
}

describe("DocumentTopBar", () => {
  it("sits in flow while the widget's top is still on screen", () => {
    const header = renderTopBar(mountRoot([0]));
    expect(header.style.position).toBe("");
    expect(header.style.transform).toBe("translateY(0px)");
  });

  /**
   * Regression: the hide used `translateY(-150%)`, and a transform percentage
   * resolves against the element's own height — a flat 60px — regardless of
   * how far down the viewport the bar starts. `topOffset` is documented as the
   * height of a host site's fixed navbar, and at anything past ~15px the bar
   * started lower than 60px from the top, so "hidden" left it parked on screen.
   */
  it.each([
    { topOffset: undefined, label: "no host navbar" },
    { topOffset: 72, label: "a 72px host navbar" },
    { topOffset: 200, label: "a very tall host navbar" },
  ])("clears the viewport when hidden with $label", ({ topOffset }) => {
    vi.useFakeTimers();
    // Second measurement is higher up the page than the first: scrolled down.
    const header = renderTopBar(mountRoot([-100, -400]), topOffset);
    scrollDown();

    expect(header.style.position).toBe("fixed");

    // Where the bar's bottom edge lands once the transform has been applied:
    // its `top` (topOffset + the 10px inset), less the 10px margin pull that
    // sits it flush, plus its own height. At or below 0 means it's off-screen.
    const barTop = (topOffset ?? 0) + 10 - 10;
    expect(barTop + BAR_HEIGHT - travelPx(header.style.transform)).toBeLessThanOrEqual(0);

    vi.useRealTimers();
  });
});
