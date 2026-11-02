import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

const hasMatchMedia = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

const getServerSnapshot = () => false;

/**
 * Tracks the OS `prefers-color-scheme` setting. No-ops entirely (no
 * `matchMedia` subscription) unless `enabled` — most instances never use
 * `mode: "system"`, so this avoids paying for a listener they don't need.
 *
 * Server rendering and hydration always see `false` (light), and the real
 * value is applied right after hydration, so a dark-OS visitor never gets a
 * hydration mismatch. A client-only render reads the OS value immediately.
 */
export function useSystemColorScheme(enabled: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled || !hasMatchMedia()) return () => {};
      const mql = window.matchMedia(QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [enabled],
  );
  const getSnapshot = () => enabled && hasMatchMedia() && window.matchMedia(QUERY).matches;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
