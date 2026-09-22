import { describe, expect, it } from "vitest";
import { buildThemeVars, mergeTheme, resolveThemeMode } from "../theme";

describe("buildThemeVars", () => {
  it("returns no vars when no theme is configured", () => {
    expect(buildThemeVars({}, "light")).toEqual({});
  });

  it("applies light semantic colors without inverting the neutral scale", () => {
    const vars = buildThemeVars(
      { light: { background: "#ffffff", textPrimary: "#0f172a" } },
      "light",
    );

    expect(vars["--color-background"]).toBe("255 255 255");
    expect(vars["--color-text-primary"]).toBe("15 23 42");
    expect(vars["--color-neutral-50"]).toBeUndefined();
  });

  it("applies dark semantic colors and the inverted neutral scale defaults", () => {
    const vars = buildThemeVars(
      { dark: { background: "#0f172a", textPrimary: "#f8fafc" } },
      "dark",
    );

    expect(vars["--color-background"]).toBe("15 23 42");
    expect(vars["--color-text-primary"]).toBe("248 250 252");
    expect(vars["--color-neutral-50"]).toBe("15 23 42");
  });

  it("renders the mode passed in, even when both palettes are configured", () => {
    const theme = {
      light: { background: "#ffffff" },
      dark: { background: "#000000" },
    };

    expect(buildThemeVars(theme, "light")["--color-background"]).toBe("255 255 255");
    expect(buildThemeVars(theme, "dark")["--color-background"]).toBe("0 0 0");
  });

  it("applies brand color scales regardless of which mode is active", () => {
    const vars = buildThemeVars(
      { colors: { primary: { 500: "#0EA5E9" } }, light: { background: "#ffffff" } },
      "light",
    );

    expect(vars["--color-primary-500"]).toBe("14 165 233");
  });

  it("lets an explicit dark neutral override win over the inverted default", () => {
    const vars = buildThemeVars(
      { colors: { neutral: { 50: "#111111" } }, dark: {} },
      "dark",
    );

    expect(vars["--color-neutral-50"]).toBe("17 17 17");
  });
});

describe("resolveThemeMode", () => {
  it("defaults to light when no theme is configured", () => {
    expect(resolveThemeMode(undefined, false)).toBe("light");
  });

  it("uses dark when only a dark palette is provided", () => {
    expect(resolveThemeMode({ dark: { background: "#000" } }, false)).toBe("dark");
  });

  it("uses light when only a light palette is provided", () => {
    expect(resolveThemeMode({ light: { background: "#fff" } }, false)).toBe("light");
  });

  it("prefers light when both palettes are provided and mode is unset", () => {
    expect(
      resolveThemeMode({ light: { background: "#fff" }, dark: { background: "#000" } }, false),
    ).toBe("light");
  });

  it("lets an explicit mode override regardless of which palettes are configured", () => {
    expect(resolveThemeMode({ light: { background: "#fff" }, mode: "dark" }, false)).toBe("dark");
    expect(resolveThemeMode({ dark: { background: "#000" }, mode: "light" }, false)).toBe("light");
  });

  it("resolves system mode from the OS preference", () => {
    expect(resolveThemeMode({ mode: "system" }, true)).toBe("dark");
    expect(resolveThemeMode({ mode: "system" }, false)).toBe("light");
  });
});

describe("mergeTheme", () => {
  const base = {
    colors: { primary: { 500: "#0000ff", 600: "#0000aa" } },
    light: { background: "#ffffff", textPrimary: "#111111" },
    dark: { background: "#000000", textPrimary: "#eeeeee" },
    depthColors: ["#aaaaaa", "#bbbbbb"],
  };

  it("returns the defaults when the host gives no theme", () => {
    expect(mergeTheme(base, undefined)).toBe(base);
  });

  it("keeps default brand scales when the host only changes a palette color", () => {
    const merged = mergeTheme(base, { light: { background: "#fafafa" } });
    expect(merged.colors?.primary).toEqual({ 500: "#0000ff", 600: "#0000aa" });
    expect(merged.light).toEqual({ background: "#fafafa", textPrimary: "#111111" });
    expect(merged.dark).toEqual(base.dark);
  });

  it("merges brand scales shade by shade", () => {
    const merged = mergeTheme(base, { colors: { primary: { 600: "#ff0000" } } });
    expect(merged.colors?.primary).toEqual({ 500: "#0000ff", 600: "#ff0000" });
  });

  it("replaces mode and depthColors outright", () => {
    const merged = mergeTheme(base, { mode: "dark", depthColors: ["#123456"] });
    expect(merged.mode).toBe("dark");
    expect(merged.depthColors).toEqual(["#123456"]);
  });
});
