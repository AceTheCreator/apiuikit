export interface ConfigInterface {
  show?: ShowConfig;
  expand?: ExpandConfig;
  sidebar?: SideBarConfig;
  theme?: ThemeConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parserOptions?: any;
  requestLabel?: string;
  replyLabel?: string;
}

export interface ShowConfig {
  sidebar?: boolean;
  info?: boolean;
  servers?: boolean;
  search?: boolean;
  operations?: boolean;
  messages?: boolean;
  messageExamples?: boolean;
  schemas?: boolean;
  errors?: boolean;
  /** OpenAPI only: the Endpoints tab (paths/operations). */
  endpoints?: boolean;
}

export interface ExpandConfig {
  messageExamples?: boolean;
  /**
   * Whether nested schema tree nodes (object properties, array items, etc.) start expanded.
   * The top-most level of each schema is always visible. Defaults to false.
   */
  schemas?: boolean;
}

export interface SideBarConfig {
  useChannelAddressAsIdentifier?: boolean;
}

export interface ThemeColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  500?: string;
  600?: string;
  700?: string;
}

/** Brand color scales — shared across light and dark, since they don't usually change per-mode. */
export interface ThemeColors {
  primary?: ThemeColorScale;
  secondary?: ThemeColorScale;
  neutral?: ThemeColorScale;
}

/** Semantic surface/text colors for a single mode — these inherently differ between light and dark. */
export interface ThemeModeColors {
  background?: string;
  surface?: string;
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export interface ThemeConfig {
  /** Brand color scale overrides, applied regardless of which mode is active. */
  colors?: ThemeColors;
  /** Applied when a light theme is configured. Wins over `dark` if both are set. */
  light?: ThemeModeColors;
  /** Applied when only a dark theme is configured. */
  dark?: ThemeModeColors;
  /**
   * Colors for the schema tree's depth-indicator lines (and matching label
   * text), cycled by nesting depth. Accepts any number of hex colors — if
   * nesting goes deeper than the array provided, the palette repeats from
   * the start. Defaults to the built-in palette if omitted or empty.
   */
  depthColors?: string[];
}
