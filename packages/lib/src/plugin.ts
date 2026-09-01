// Entry point for plugin authors (`import ... from "apiuikit/plugin"`), kept
// separate from the main `apiuikit` entry so consumers who don't use plugins
// never pull this surface into their bundle. Mirrors the existing
// `apiuikit/markdown` subpath's role as an independently-built entry point.

export { definePlugin } from "./plugins/types";
export type {
  ApiuikitPlugin,
  AsyncAPIOperationPluginContext,
  OpenAPIOperationPluginContext,
  PluginSlotComponent,
  PluginSlotContextMap,
  PluginSlotName,
  PluginTabSlotFill,
  SupplementarySlotName,
  TabSlotName,
} from "./plugins/types";

// PluginSlot/usePluginSlot and the document-context hooks are re-exported
// from the built `apiuikit` package (external, not bundled here) rather than
// from their relative source paths. This build and the main `apiuikit` build
// are separate Rollup graphs — bundling `./contexts` fresh in both would
// create two distinct `DocumentContext` objects, and `useDocumentContext`
// would throw "must be used within a document provider" even when correctly
// nested, since React context lookups are keyed on object identity, not
// shape. Routing through the external "apiuikit" specifier guarantees both
// entry points resolve to the one instance the consuming app actually loads.
export { PluginSlot, usePluginSlot, useOperationTabPlugins, useDocumentContext, useAsyncAPIDocument } from "apiuikit";
export type {
  PluginSlotProps,
  PluginTabEntry,
  DocumentContextValue,
  AsyncAPIDocumentContextValue,
  OpenAPIDocumentContextValue,
} from "apiuikit";

// The resolved `config` prop (theme included) is available as
// `useDocumentContext().config` — see DocumentContextBase's doc comment for
// why colors are usually better read from CSS custom properties instead.
export type {
  ConfigInterface,
  ThemeColors,
  ThemeColorScale,
  ThemeConfig,
  ThemeModeColors,
} from "apiuikit";

// Document-shape types, for resolving an operation out of the `document` a
// slot context hands you (see OpenAPIOperationPluginContext /
// AsyncAPIOperationPluginContext) — e.g. `document.paths[path][method]`.
// Type-only, so re-exporting from source here (rather than through the
// external "apiuikit" specifier like the runtime values above) is fine: types
// are erased at build time and have no singleton-identity concern.
export type {
  HttpMethod,
  OpenAPIDocumentData,
  OpenAPIOperationData,
  OpenAPIParameterData,
  OpenAPIPathItemData,
  OpenAPIRequestBodyData,
  OpenAPISecuritySchemeData,
  OpenAPIServerData,
} from "./types/openapi";
export type { AsyncAPIDocumentData } from "./types/schema";
