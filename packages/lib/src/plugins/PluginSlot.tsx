import { Suspense, useMemo } from "react";
import { useDocumentContext } from "../contexts";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { PluginSlotComponent, PluginSlotContextMap, PluginSlotName, PluginTabSlotFill, TabSlotName } from "./types";

/** Isolates one plugin's render in its own error boundary + Suspense
 * boundary, tagged with `label` for the console error, so one broken or
 * slow-loading plugin can't take down the document or a sibling plugin.
 * Shared by `PluginSlot` (one boundary per component in a slot) and the
 * `*.operation.tab` containers (one boundary around whichever tab is active). */
export function PluginBoundary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => console.error(`[apiuikit] plugin error in slot "${label}":`, error)}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/** Every plugin (from `useDocumentContext().plugins`) that fills `name`, in
 * registration order. */
export function usePluginSlot<N extends PluginSlotName>(name: N): PluginSlotComponent<N>[] {
  const { plugins } = useDocumentContext();
  return useMemo(
    () =>
      (plugins ?? [])
        .filter((plugin) => name in plugin.slots)
        .map((plugin) => plugin.slots[name] as PluginSlotComponent<N>),
    [plugins, name],
  );
}

export interface PluginSlotProps<N extends PluginSlotName> {
  name: N;
  context: PluginSlotContextMap[N];
}

/**
 * Renders every plugin registered for `name`, each isolated in its own
 * `ErrorBoundary` + `Suspense` boundary so one broken or slow-loading plugin
 * can't take down the document or its sibling plugins. Renders nothing when
 * no plugin fills this slot.
 */
export function PluginSlot<N extends PluginSlotName>({ name, context }: PluginSlotProps<N>) {
  const components = usePluginSlot(name);
  if (components.length === 0) return null;

  return (
    <>
      {components.map((Slot, index) => (
        <PluginBoundary key={index} label={name}>
          <Slot {...context} />
        </PluginBoundary>
      ))}
    </>
  );
}

/** One plugin's fill of a `*.operation.tab` slot, resolved into what the
 * operation panel's tab strip needs: a stable id to select on (the plugin's
 * own `name`), the label it declared, and its component. */
export interface PluginTabEntry<N extends TabSlotName> {
  id: string;
  label: string;
  Component: PluginSlotComponent<N>;
}

/** Every plugin filling the `*.operation.tab` slot `name`, in registration
 * order — what `PathOperation`/`Operation` build their tab strip from. Not
 * meant for plugin authors themselves (a plugin doesn't render its own tab
 * strip); exported alongside `PluginSlot`/`usePluginSlot` for the same reason
 * those are: only relevant if you're building something that itself hosts
 * `*.operation.tab` plugins, like a custom operation panel. */
export function useOperationTabPlugins<N extends TabSlotName>(name: N): PluginTabEntry<N>[] {
  const { plugins } = useDocumentContext();
  return useMemo(
    () =>
      (plugins ?? [])
        .filter((plugin) => name in plugin.slots)
        .map((plugin) => {
          const fill = plugin.slots[name] as PluginTabSlotFill<N>;
          return { id: plugin.name, label: fill.label, Component: fill.component };
        }),
    [plugins, name],
  );
}

export default PluginSlot;
