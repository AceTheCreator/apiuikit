import { afterEach, describe, expect, it } from "vitest";
import {
  getContainedScrollLockTarget,
  getScrollLockTarget,
} from "../scrollLock";

const mountedElements: HTMLElement[] = [];

function element(parent: HTMLElement, overflowY = "visible") {
  const child = document.createElement("div");
  child.style.overflowY = overflowY;
  parent.appendChild(child);
  mountedElements.push(child);
  return child;
}

function makeScrollable(target: HTMLElement) {
  Object.defineProperties(target, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 200 },
  });
}

afterEach(() => {
  mountedElements.splice(0).reverse().forEach((target) => target.remove());
});

describe("scroll lock target selection", () => {
  it("retains the document fallback for viewport overlays", () => {
    const root = element(document.body);
    const portalHost = element(root);

    expect(getScrollLockTarget(portalHost)).toBe(document.documentElement);
  });

  it("does not escape a component boundary when the widget is not scrollable", () => {
    const hostScroller = element(document.body, "auto");
    makeScrollable(hostScroller);
    const root = element(hostScroller);
    const portalHost = element(root);

    expect(getContainedScrollLockTarget(portalHost, root)).toBeNull();
  });

  it("locks a scrollable widget root without locking its host", () => {
    const hostScroller = element(document.body, "auto");
    makeScrollable(hostScroller);
    const root = element(hostScroller, "auto");
    makeScrollable(root);
    const portalHost = element(root);

    expect(getContainedScrollLockTarget(portalHost, root)).toBe(root);
  });
});
