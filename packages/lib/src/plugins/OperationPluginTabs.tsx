import { useId, useState } from "react";
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
  const idPrefix = useId();
  const showTabs = enabled && plugins.length > 0;
  const activePlugin = showTabs
    ? plugins.find((entry) => entry.id === selectedId)
    : undefined;
  const ActivePluginComponent = activePlugin?.Component;
  const currentId = activePlugin?.id ?? REFERENCE_TAB_ID;
  const tabs = [
    { id: REFERENCE_TAB_ID, name: "Reference" },
    ...plugins.map((entry) => ({ id: entry.id, name: entry.label })),
  ];

  const content = activePlugin && ActivePluginComponent ? (
    <PluginBoundary label={`${name}:${activePlugin.pluginName}`}>
      <ActivePluginComponent {...context} />
    </PluginBoundary>
  ) : (
    children
  );

  return (
    <>
      {showTabs && (
        <Tabs
          variant="segmented"
          ariaLabel="Operation view"
          idPrefix={idPrefix}
          tabs={tabs}
          current={currentId}
          onChange={setSelectedId}
        />
      )}
      <TabPanels enabled={showTabs} tabs={tabs} current={currentId} idPrefix={idPrefix}>
        {content}
      </TabPanels>
    </>
  );
}
