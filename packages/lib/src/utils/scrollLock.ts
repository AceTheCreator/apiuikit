function isScrollable(el: Element): boolean {
  const overflowY = getComputedStyle(el).overflowY;
  return (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight;
}

/**
 * Walks up from `from` to find the nearest ancestor that actually scrolls.
 * Falls back to the document root so embedding the widget in a plain,
 * non-scrolling page still locks the page scroll as expected.
 */
export function getScrollLockTarget(from: Element | null): HTMLElement {
  let el: Element | null = from;
  while (el && el !== document.body) {
    if (isScrollable(el)) return el as HTMLElement;
    el = el.parentElement;
  }
  return document.documentElement;
}

/**
 * Finds a scroll lock target without escaping `boundary`. This is used by
 * component-contained overlays: an ancestor owned by the host page must not
 * be locked merely because the widget itself has no scroll container.
 */
export function getContainedScrollLockTarget(
  from: Element | null,
  boundary: Element | null,
): HTMLElement | null {
  if (!from || !boundary || !boundary.contains(from)) return null;

  let el: Element | null = from;
  while (el) {
    if (isScrollable(el)) return el as HTMLElement;
    if (el === boundary) break;
    el = el.parentElement;
  }

  return null;
}

/**
 * Locks scroll on `target` and pads it to compensate for the scrollbar
 * that disappears, so surrounding content doesn't shift. Returns a
 * function that restores the original styles.
 */
export function lockScroll(target: HTMLElement): () => void {
  const previousOverflow = target.style.overflow;
  const previousPaddingRight = target.style.paddingRight;
  const scrollbarWidth = target.offsetWidth - target.clientWidth;

  target.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const currentPaddingRight = parseFloat(getComputedStyle(target).paddingRight) || 0;
    target.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }

  return () => {
    target.style.overflow = previousOverflow;
    target.style.paddingRight = previousPaddingRight;
  };
}
