import { ConfigInterface } from "./config";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";

export const defaultConfig: ConfigInterface = {
  show: {
    sidebar: true,
    info: true,
    servers: true,
    operations: true,
    messages: true,
    messageExamples: false,
    schemas: true,
    // errors: true,
  },
  theme: {
    // GitHub Dark (Primer) accent scale — kept in sync with the playground's
    // own UI_PALETTES.dark in packages/playground/src/theme.ts.
    colors: {
      primary: {
        50:  "#ddf4ff",
        100: "#b6e3ff",
        200: "#80ccff",
        300: "#54aeff",
        500: "#58a6ff",
        600: "#1f6feb",
        700: "#0d419d",
      },
    },
    // Matches the :root fallback values in index.css — kept explicit here so light
    // wins outright over `dark` below per buildThemeVars' precedence rule.
    light: {
      background: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",

      textPrimary: "#1e293b",
      textSecondary: "#475569",
      textMuted: "#64748b",
    },
    dark: {
      background: "#0d1117",
      surface: "#161b22",
      border: "#30363d",

      textPrimary: "#c9d1d9",
      textSecondary: "#8b949e",
      textMuted: "#6e7681",
    },
    depthColors: DEFAULT_DEPTH_COLORS,
  },
  expand: {
    schemas: false,
  },
  sidebar: {
    useChannelAddressAsIdentifier: true,
  },
  sidePanel: {
    containment: "viewport",
  },
};
