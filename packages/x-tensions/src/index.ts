import type { ExtensionCatalog } from "./types";

export type { ExtensionComponent, ExtensionComponentProps, ExtensionLoader, ExtensionCatalog } from "./types";

/**
 * Known spec extensions this library can render, keyed by field name. Each
 * entry is a loader (not the component itself) so bundlers code-split it into
 * its own chunk, only fetched when that key actually appears in a document.
 * Add new extensions here; nothing outside this package needs to change.
 */
export const catalog: ExtensionCatalog = {
  "x-x": () => import("./extensions/XExtension"),
  "x-linkedin": () => import("./extensions/LinkedInExtension"),
};
