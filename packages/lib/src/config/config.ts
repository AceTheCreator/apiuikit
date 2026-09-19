import type { AsyncAPIDocumentData } from "../types/schema";
import type { HttpMethod, OpenAPIDocumentData } from "../types/openapi";

export interface ConfigInterface {
  /**
   * Host-page safe area in pixels above fixed and sticky widget controls.
   * Set this to the height of a fixed/sticky site navbar. Defaults to `0`.
   */
  topOffset?: number;
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
  /**
   * Optional override for the widget-wide `topOffset` on component-contained
   * panels. Defaults to `ConfigInterface.topOffset` and has no effect when
   * `containment` is `"viewport"`.
   */
  topOffset?: number;
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
  /**
   * OpenAPI only: the built-in "Try it" panel — a request builder in the
   * operation side panel that sends real requests from the reader's browser.
   *
   * **Defaults to false**, unlike every other flag here. Enabling it turns a
   * documentation page into one that collects credentials from readers and
   * holds them in `sessionStorage` for the tab's lifetime, and requests go to
   * whichever origin the *document's* `servers` entry names — so the decision
   * belongs to the host, made once, rather than arriving with an upgrade.
   *
   * The panel's code is a separate chunk, fetched only when this is on: a
   * consumer who leaves it off ships nothing extra to their readers.
   */
  tryIt?: boolean;
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

/**
 * Which palette to render. `"light"` / `"dark"` pick that palette outright.
 * `"system"` follows the OS `prefers-color-scheme` setting and updates live
 * if it changes while mounted.
 *
 * Left unset, resolution preserves pre-`mode` behavior: whichever single one
 * of `light`/`dark` you provided is used; if you provided both (or neither),
 * `light` is used. Set `mode` explicitly — including `"system"` — to opt in
 * to OS-driven switching.
 */
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  /** Brand color scale overrides, applied regardless of which mode is active. */
  colors?: ThemeColors;
  /** Which palette to render — see {@link ThemeMode}. */
  mode?: ThemeMode;
  /** Palette applied when the resolved mode is `"light"`. Both `light` and `dark` may be set at once — `mode` decides which renders. */
  light?: ThemeModeColors;
  /** Palette applied when the resolved mode is `"dark"`. */
  dark?: ThemeModeColors;
  /**
   * Colors for the schema tree's depth-indicator lines (and matching label
   * text), cycled by nesting depth. Accepts any number of hex colors — if
   * nesting goes deeper than the array provided, the palette repeats from
   * the start. Defaults to the built-in palette if omitted or empty.
   */
  depthColors?: string[];
}
