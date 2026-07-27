import { useEffect, useRef } from "react";
import { highlightSearchMatch } from "../helpers/textHighlight";

export interface ActiveHighlight {
  targetId: string;
  query: string;
  highlight: boolean;
}

/**
 * Scrolls to and highlights a search result's target element once it exists
 * in the DOM, retrying since the target may not be rendered yet (e.g. the tab
 * holding it just changed). Shared behind both AsyncAPI/Layout.tsx and
 * OpenAPI/Layout.tsx, which otherwise duplicated this effect verbatim.
 *
 * `deps` should list every piece of state that changes which DOM subtree is
 * currently rendered (active tab, selected item keys, focus targets, ...) —
 * anything that could change whether `activeHighlight.targetId` already
 * exists in the DOM. Its length must stay constant across renders for a given
 * call site, same as any other hook dependency list.
 */
export function useSearchResultFocus(activeHighlight: ActiveHighlight | null, deps: readonly unknown[]) {
  const lastScrolledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeHighlight) return;
    const { targetId, query, highlight } = activeHighlight;
    let cancelled = false;

    const findWrapper = (attempt: number) => {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      if (!target) {
        if (attempt < 40) setTimeout(() => findWrapper(attempt + 1), 50);
        return;
      }
      if (lastScrolledIdRef.current !== targetId) {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          // ignore, highlighting still proceeds below
        }
        lastScrolledIdRef.current = targetId;
      }
      if (highlight) refreshHighlight(0);
    };

    const refreshHighlight = (attempt: number) => {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      if (target) highlightSearchMatch(target, query);
      if (attempt < 6) setTimeout(() => refreshHighlight(attempt + 1), 100);
    };

    setTimeout(() => findWrapper(0), 50);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHighlight, ...deps]);
}
