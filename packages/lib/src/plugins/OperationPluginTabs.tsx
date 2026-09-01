import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Tabs, { TabPanels } from "../components/Tabs";
import { PluginBoundary, useOperationTabPlugins } from "./PluginSlot";
import type { PluginSlotContextMap, TabSlotName } from "./types";

const REFERENCE_TAB_ID = "reference";

interface OperationPluginTabsProps<N extends TabSlotName> {
  name: N;
  context: PluginSlotContextMap[N];
  /** Whether this operation may host tabs. Callback operations, for example, may not. */
  enabled?: boolean;
  children: ReactNode;
}

/** Shared host for operation-level plugin tabs and the built-in Reference
 * content. Owns selection, fallback, DOM ids, ARIA panels, and isolation. */
export default function OperationPluginTabs<N extends TabSlotName>({
  name,
  context,
  enabled = true,
  children,
}: OperationPluginTabsProps<N>) {
  const plugins = useOperationTabPlugins(name);
  const [selectedId, setSelectedId] = useState(REFERENCE_TAB_ID);
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<string>>(
    () => new Set([REFERENCE_TAB_ID]),
  );
  const idPrefix = useId();
  const pluginsById = useMemo(
    () => new Map(plugins.map((plugin) => [plugin.id, plugin])),
    [plugins],
  );
  const showTabs = enabled && plugins.length > 0;
  const activePlugin = showTabs
    ? pluginsById.get(selectedId)
    : undefined;
  const currentId = activePlugin?.id ?? REFERENCE_TAB_ID;
  const tabs = [
    { id: REFERENCE_TAB_ID, name: "Reference" },
    ...plugins.map((entry) => ({ id: entry.id, name: entry.label })),
  ];

  const selectTab = (id: string) => {
    setVisitedIds((previous) =>
      previous.has(id) ? previous : new Set([...previous, id]),
    );
    setSelectedId(id);
  };

  if (!showTabs) return <>{children}</>;

  return (
    <>
      <Tabs
        variant="segmented"
        ariaLabel="Operation view"
        idPrefix={idPrefix}
        tabs={tabs}
        current={currentId}
        onChange={selectTab}
      />
      <TabPanels
        tabs={tabs}
        current={currentId}
        idPrefix={idPrefix}
        renderPanel={(tab, active) => {
          if (!active && !visitedIds.has(tab.id)) return null;
          if (tab.id === REFERENCE_TAB_ID) return children;

          const plugin = pluginsById.get(tab.id);
          if (!plugin) return null;
          const Component = plugin.Component;
          return (
            <PluginBoundary label={`${name}:${plugin.pluginName}`}>
              <Component {...context} />
            </PluginBoundary>
          );
        }}
      />
    </>
  );
}
