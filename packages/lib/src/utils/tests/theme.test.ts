import { describe, expect, it } from "vitest";
import { buildThemeVars } from "../theme";

describe("buildThemeVars", () => {
  it("returns no vars when no theme is configured", () => {
    expect(buildThemeVars({})).toEqual({});
  });

  it("applies light semantic colors without inverting the neutral scale", () => {
    const vars = buildThemeVars({
      light: { background: "#ffffff", textPrimary: "#0f172a" },
    });

    expect(vars["--color-background"]).toBe("255 255 255");
    expect(vars["--color-text-primary"]).toBe("15 23 42");
    expect(vars["--color-neutral-50"]).toBeUndefined();
  });

  it("applies dark semantic colors and the inverted neutral scale defaults", () => {
    const vars = buildThemeVars({
      dark: { background: "#0f172a", textPrimary: "#f8fafc" },
    });

    expect(vars["--color-background"]).toBe("15 23 42");
    expect(vars["--color-text-primary"]).toBe("248 250 252");
    expect(vars["--color-neutral-50"]).toBe("15 23 42");
  });

  it("prefers light over dark when both are configured", () => {
    const vars = buildThemeVars({
      light: { background: "#ffffff" },
      dark: { background: "#000000" },
    });

    expect(vars["--color-background"]).toBe("255 255 255");
  });

  it("applies brand color scales regardless of which mode is active", () => {
    const vars = buildThemeVars({
      colors: { primary: { 500: "#0EA5E9" } },
      light: { background: "#ffffff" },
    });

    expect(vars["--color-primary-500"]).toBe("14 165 233");
  });

  it("lets an explicit dark neutral override win over the inverted default", () => {
    const vars = buildThemeVars({
      colors: { neutral: { 50: "#111111" } },
      dark: {},
    });

    expect(vars["--color-neutral-50"]).toBe("17 17 17");
  });
});
