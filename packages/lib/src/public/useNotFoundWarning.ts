import { useEffect } from "react";

/**
 * Warns when a single-item section can't find the item it was asked for. The
 * section renders nothing in that case, the same way a mis-nested section
 * degrades instead of crashing the page; this is what makes the blank spot
 * explainable. Fires once per distinct miss rather than on every render.
 */
export function useNotFoundWarning(missing: boolean, message: string) {
  useEffect(() => {
    if (missing) console.warn(`[apiuikit] ${message}`);
  }, [missing, message]);
}
