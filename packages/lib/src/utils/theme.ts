import { ThemeColorScale, ThemeConfig, ThemeModeColors } from "../config/config";
import { SHADES } from "../contants";

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `${r} ${g} ${b}`;
}

function buildColorScaleVars(
  scale: ThemeColorScale | undefined,
  prefix: string,
  vars: Record<string, string>,
) {
  if (!scale) return;

  for (const shade of SHADES) {
    const value = scale[shade];

    if (value) {
      vars[`--color-${prefix}-${shade}`] = hexToRgbChannels(value);
    }
  }
}

const COLOR_VAR_MAP: Array<[keyof ThemeModeColors, string]> = [
  ["background",    "--color-background"],
  ["surface",       "--color-surface"],
  ["border",        "--color-border"],
  ["textPrimary",   "--color-text-primary"],
  ["textSecondary", "--color-text-secondary"],
  ["textMuted",     "--color-text-muted"],
];

const DARK_NEUTRAL_DEFAULTS: Record<number, string> = {
  50:  "15 23 42",
  100: "30 41 59",
  200: "51 65 85",
  300: "71 85 105",
  500: "148 163 184",
  600: "203 213 225",
  700: "226 232 240",
  800: "241 245 249",
  900: "248 250 252",
};

export type ResolvedThemeMode = "light" | "dark";

/**
 * Resolves which palette to actually render.
 *
 * An explicit `theme.mode` wins outright (`"system"` follows
 * `systemPrefersDark`). Left unset, this replicates pre-`mode` behavior:
 * whichever single one of `light`/`dark` is provided wins; light wins if
 * both — or neither — are provided.
 */
export function resolveThemeMode(
  theme: ThemeConfig | undefined,
  systemPrefersDark: boolean,
): ResolvedThemeMode {
  const configuredMode = theme?.mode;

  if (configuredMode === "light" || configuredMode === "dark") return configuredMode;
  if (configuredMode === "system") return systemPrefersDark ? "dark" : "light";
  if (theme?.dark && !theme?.light) return "dark";

  return "light";
}

export function buildThemeVars(
  theme: ThemeConfig,
  mode: ResolvedThemeMode,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const modeColors = mode === "dark" ? theme.dark : theme.light;

  if (mode === "dark") {
    // Apply inverted neutral scale as defaults — user's neutral overrides these below
    for (const [shade, value] of Object.entries(DARK_NEUTRAL_DEFAULTS)) {
      vars[`--color-neutral-${shade}`] = value;
    }
  }

  if (modeColors) {
    for (const [key, cssVar] of COLOR_VAR_MAP) {
      const value = modeColors[key];
      if (value) vars[cssVar] = hexToRgbChannels(value);
    }
  }

  // Brand scales apply regardless of which mode is active.
  if (theme.colors) {
    buildColorScaleVars(theme.colors.primary,   "primary",   vars);
    buildColorScaleVars(theme.colors.secondary, "secondary", vars);
    buildColorScaleVars(theme.colors.neutral,   "neutral",   vars); // explicit overrides win
  }

  return vars;
}
