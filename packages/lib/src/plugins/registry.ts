import type { ApiuikitPlugin, PluginSlotName, TabSlotName } from "./types";

/** Internal, normalized values consumed by the slot hooks. Supplementary
 * slots contain components; tab slots contain tab descriptors. The public
 * hooks restore the precise per-slot type when reading an entry. */
export type PluginSlotRegistry = ReadonlyMap<PluginSlotName, readonly unknown[]>;

const isTabSlot = (name: PluginSlotName): name is TabSlotName => name.endsWith(".tab");

/** Indexes every declared fill once, preserving plugin registration order. */
export function createPluginSlotRegistry(plugins: readonly ApiuikitPlugin[]): PluginSlotRegistry {
  const registry = new Map<PluginSlotName, unknown[]>();

  for (const [pluginIndex, plugin] of plugins.entries()) {
    for (const name of Object.keys(plugin.slots) as PluginSlotName[]) {
      const fill = plugin.slots[name];
      if (!fill) continue;

      const entries = registry.get(name) ?? [];
      if (!registry.has(name)) registry.set(name, entries);

      if (isTabSlot(name)) {
        const tab = fill as { label: string; component: unknown };
        entries.push({
          id: `${name.replace(/\./g, "-")}-plugin-${pluginIndex}`,
          pluginName: plugin.name,
          label: tab.label,
          Component: tab.component,
        });
      } else {
        entries.push(fill);
      }
    }
  }

  return registry;
}
