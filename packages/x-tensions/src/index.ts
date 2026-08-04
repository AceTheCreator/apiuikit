import type { ExtensionCatalog, ExtensionLoader } from "./types";

export type { ExtensionComponent, ExtensionComponentProps, ExtensionLoader, ExtensionCatalog } from "./types";

/**
 * Known spec extensions this library can render inline (e.g. in an icon
 * row), keyed by field name. Each entry is a loader (not the component
 * itself) so bundlers code-split it into its own chunk, only fetched when
 * that key actually appears in a document. Add new extensions here; nothing
 * outside this package needs to change.
 */
export const catalog: ExtensionCatalog = {
  "x-x": () => import("./extensions/XExtension"),
  "x-linkedin": () => import("./extensions/LinkedInExtension"),
};

/**
 * x-logo renders at the top of the info metadata section rather than in the
 * generic icon row, so it's consumed directly by callers instead of through
 * `catalog`.
 */
export const logoLoader: ExtensionLoader = () => import("./extensions/LogoExtension");
