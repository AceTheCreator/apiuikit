import type { ComponentType } from "react";
import type { HttpMethod, OpenAPIDocumentData } from "../types/openapi";
import type { AsyncAPIDocumentData } from "../types/schema";

/** Registered names third-party plugins can fill. Add a new member here (and
 * a matching entry in `PluginSlotContextMap`) whenever a new extension point
 * is introduced — every existing plugin keeps compiling unchanged since
 * `ApiuikitPlugin.slots` only requires the entries a plugin actually fills.
 *
 * Two shapes exist:
 * - `*.operation.reference.supplementary` — rendered at the supplementary
 *   extension point within the built-in Reference panel. Reserved for small,
 *   secondary additions that complement rather than replace its content.
 * - `*.operation.tab` — a full tab in the operation panel's tab strip,
 *   alongside the built-in "Reference" tab. Selecting it hands the
 *   plugin the *entire* panel body instead of a sliver of it — see
 *   `TabSlotName`/`PluginTabSlotFill`. This is what a plugin like "try it
 *   out" wants: its own space, not squeezed between documentation sections. */
/** Slots whose fill is rendered directly at the extension point. Unlike tab
 * slots, these are filled by a bare React component. */
export type SupplementarySlotName =
  | "openapi.operation.reference.supplementary"
  | "asyncapi.operation.reference.supplementary";

/** The `*.operation.tab` slots — see `PluginSlotName`'s doc comment for what
 * distinguishes them from inline slots. */
export type TabSlotName = "openapi.operation.tab" | "asyncapi.operation.tab";

export type PluginSlotName = SupplementarySlotName | TabSlotName;

/**
 * The whole document plus which OpenAPI operation this slot instance is
 * for, identified by `method`/`path` (its key in `document.paths`, not the
 * optional, often-absent `operationId` field). Deliberately unopinionated:
 * apiuikit doesn't pre-extract parameters/requestBody/security for you —
 * look those up from `document.paths[path][method]` yourself and resolve
 * whatever shape your plugin actually needs. This keeps the slot contract
 * stable as the document
 * schema's own details evolve, and doesn't force every plugin through the
 * same request-shape assumptions a fixed set of fields would bake in.
 */
export interface OpenAPIOperationPluginContext {
  document: OpenAPIDocumentData;
  method: HttpMethod;
  path: string;
}

/** The whole document plus which AsyncAPI operation this slot instance is
 * for — its key in `document.operations`. Look up the operation itself
 * (`document.operations[operationId]`) for its action, messages, bindings,
 * or anything else your plugin needs. */
export interface AsyncAPIOperationPluginContext {
  document: AsyncAPIDocumentData;
  operationId: string;
}

export interface PluginSlotContextMap {
  "openapi.operation.reference.supplementary": OpenAPIOperationPluginContext;
  "asyncapi.operation.reference.supplementary": AsyncAPIOperationPluginContext;
  "openapi.operation.tab": OpenAPIOperationPluginContext;
  "asyncapi.operation.tab": AsyncAPIOperationPluginContext;
}

export type PluginSlotComponent<N extends PluginSlotName> = ComponentType<PluginSlotContextMap[N]>;

/** What a plugin fills a `*.operation.tab` slot with: its component, plus the
 * label its tab shows in the operation panel's tab strip (next to the
 * built-in "Reference" tab). Static text owned by the plugin, not
 * host-configurable — the host doesn't know a plugin's tabs exist ahead of
 * registering it. Two plugins filling the same tab slot each get their own
 * tab, in registration order. */
export interface PluginTabSlotFill<N extends TabSlotName> {
  label: string;
  component: PluginSlotComponent<N>;
}

/** Supplementary slots are filled with a bare component; `*.operation.tab`
 * slots are filled with a `PluginTabSlotFill` (component + tab label), since
 * the host needs the label before any tab's content is rendered. */
type PluginSlotFill<N extends PluginSlotName> = N extends TabSlotName
  ? PluginTabSlotFill<N>
  : PluginSlotComponent<N>;

/** A plugin fills one or more named slots. Unfilled slots are simply absent
 * from `slots` rather than declared with a null/undefined value. */
export interface ApiuikitPlugin {
  /** Unique, human-readable identifier, e.g. "try-it-out-http". Used only in
   * error/debug messages today, not as a registry key. */
  name: string;
  slots: { [N in PluginSlotName]?: PluginSlotFill<N> };
}

/** Identity helper: exists purely so plugin authors get a typed object
 * literal (and future validation, if it's ever needed) without importing
 * `ApiuikitPlugin` by name at every call site. */
export function definePlugin(plugin: ApiuikitPlugin): ApiuikitPlugin {
  return plugin;
}
