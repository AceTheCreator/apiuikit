import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSystemColorScheme } from "../useSystemColorScheme";

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initialMatches: boolean) {
  let listener: Listener | null = null;
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_: string, handler: Listener) => {
      listener = handler;
    }),
    removeEventListener: vi.fn(),
  };
  const matchMedia = vi.fn().mockReturnValue(mql);
  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    fireChange(matches: boolean) {
      mql.matches = matches;
      act(() => listener?.({ matches } as MediaQueryListEvent));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSystemColorScheme", () => {
  it("returns false and never touches matchMedia when disabled", () => {
    const { matchMedia } = mockMatchMedia(true);
    const { result } = renderHook(() => useSystemColorScheme(false));

    expect(result.current).toBe(false);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("returns false when enabled but matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useSystemColorScheme(true));

    expect(result.current).toBe(false);
  });

  it("reflects the current OS preference when enabled", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSystemColorScheme(true));

    expect(result.current).toBe(true);
  });

  it("updates live when the OS preference changes", () => {
    const { fireChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useSystemColorScheme(true));

    expect(result.current).toBe(false);
    fireChange(true);
    expect(result.current).toBe(true);
  });
});
