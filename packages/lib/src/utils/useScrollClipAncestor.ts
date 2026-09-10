import { useLayoutEffect, useState } from "react";
import { isScrollable } from "./scrollLock";

/**
 * Finds the nearest ancestor of `element` that actually clips/scrolls its
 * own content (e.g. a host page's bounded preview pane), stopping at
 * `document.body`. Returns `null` when none exists — the common full-page
 * host case, where the true browser viewport is the right anchor.
 *
 * This exists for viewport-pinned overlays that need a *stable* anchor rect:
 * `element`'s own bounding rect moves (often deep negative) as it scrolls
 * inside such an ancestor, but the ancestor's own box doesn't move just
 * because its content scrolled.
 */
export function useScrollClipAncestor(element: HTMLElement | null): HTMLElement | null {
  const [ancestor, setAncestor] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!element) {
      setAncestor(null);
      return;
    }

    let el: HTMLElement | null = element.parentElement;
    while (el && el !== document.body) {
      if (isScrollable(el)) {
        setAncestor(el);
        return;
      }
      el = el.parentElement;
    }
    setAncestor(null);
  }, [element]);

  return ancestor;
}
