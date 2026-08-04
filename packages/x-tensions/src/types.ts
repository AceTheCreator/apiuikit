import type { ComponentType } from "react";

export interface ExtensionComponentProps {
  /** The x-* field's raw value from the document, e.g. the string under `x-x`. Each component narrows this itself; the catalog is heterogeneous so the boundary can't be typed more specifically. */
  value: unknown;
  /** Dotted path to the field, e.g. "info.x-x", for keys or debugging, not display. */
  path: string;
}

export type ExtensionComponent = ComponentType<ExtensionComponentProps>;

/** Returns the extension's component module, wrapped in `import()` so bundlers
 * code-split it into its own chunk, only fetched when the key is actually
 * found in a rendered document. */
export type ExtensionLoader = () => Promise<{ default: ExtensionComponent }>;

/** Maps an x-* field name (e.g. "x-x") to its lazy-loadable renderer. */
export type ExtensionCatalog = Record<string, ExtensionLoader>;
