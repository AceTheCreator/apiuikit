import { useEffect, useState } from "react";

function getInitialPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Tracks the OS `prefers-color-scheme` setting. No-ops entirely (no
 * `matchMedia` subscription) unless `enabled` — most instances never use
 * `mode: "system"`, so this avoids paying for a listener they don't need.
 */
export function useSystemColorScheme(enabled: boolean): boolean {
  const [prefersDark, setPrefersDark] = useState(() => (enabled ? getInitialPrefersDark() : false));

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [enabled]);

  return prefersDark;
}
