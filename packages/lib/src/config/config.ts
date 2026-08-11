import type { AsyncAPIDocumentData } from "../types/schema";
import type { HttpMethod, OpenAPIDocumentData } from "../types/openapi";

export interface ConfigInterface {
  show?: ShowConfig;
  expand?: ExpandConfig;
  sidebar?: SideBarConfig;
  sidePanel?: SidePanelConfig;
  theme?: ThemeConfig;
  markdown?: MarkdownConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parserOptions?: any;
  requestLabel?: string;
  replyLabel?: string;
}

/** Where SidePanel overlays are clipped when opened from Operations / endpoints. */
export type SidePanelContainment = "component" | "viewport";

export interface SidePanelConfig {
  /**
   * `"viewport"` (default) — overlay covers the full browser viewport edge-to-edge.
   * `"component"` — overlay is clipped to the widget's root element.
   */
  containment?: SidePanelContainment;
}

type MarkdownDocument = AsyncAPIDocumentData | OpenAPIDocumentData;

/** What "View as Markdown" is being asked to open. Operation targets are
 * discriminated by their spec-specific address, preventing invalid
 * method/path/id combinations for TypeScript consumers. */
export type MarkdownTarget =
  | {
      kind: "document";
      /** The resolved document currently being rendered. */
      document: MarkdownDocument;
      method?: never;
      path?: never;
      id?: never;
    }
  | {
      kind: "operation";
      document: OpenAPIDocumentData;
      /** OpenAPI endpoint method, e.g. `"get"`. */
      method: HttpMethod;
      /** OpenAPI endpoint path, e.g. `"/pets/{petId}"`. */
      path: string;
      id?: never;
    }
  | {
      kind: "operation";
      document: AsyncAPIDocumentData;
      /** AsyncAPI operation key, e.g. `"sendLightMeasurement"`. */
      id: string;
      method?: never;
      path?: never;
    };

/**
 * Returns the URL serving `target` as Markdown, or `null`/`undefined` for
 * targets you don't serve, which falls back to the generated `blob:` URL.
 */
export type MarkdownUrlResolver = (target: MarkdownTarget) => string | null | undefined;

export interface MarkdownConfig {
  /**
   * A hosted URL serving this document as Markdown. When set, "View as
   * Markdown" opens it instead of generating a throwaway `blob:` URL, which
   * is ephemeral, unshareable, and invisible to crawlers.
   *
   * Only you can serve such a URL, since the library has no server and
   * doesn't own your routes. Pass a function to decide per target, returning
   * `null` for anything you don't serve.
   */
  url?: string | MarkdownUrlResolver;
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
  /** OpenAPI 3.1 only: the Webhooks tab. The tab appears only when the document declares `webhooks`. */
  webhooks?: boolean;
  /** Whether to render known x-* spec extensions (see the `x-tensions` catalog). Defaults to true. */
  extensions?: boolean;
  // Whether to render per-operation / per-endpoint code samples
  codeSamples?: boolean;
  /** The "Copy for LLM" / "View as Markdown" floating button. Defaults to true. */
  copyMarkdown?: boolean;
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
