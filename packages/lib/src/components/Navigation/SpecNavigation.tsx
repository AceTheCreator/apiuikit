import Navigation, { ErasedNavSection } from "./Navigation";

export interface SpecNavigationProps<TabKey extends string> {
  /**
   * Section descriptors in page order. Memoize them in the calling adapter so
   * Navigation's scroll-spy observer (keyed on `sections` identity) survives
   * unrelated re-renders.
   */
  sections: ErasedNavSection[];
  activeTab: TabKey | "servers" | "info" | null;
  onTabChange: (tab: TabKey) => void;
  onItemSelect?: (tab: TabKey, key: string) => void;
  onSelectServer?: (key: string) => void;
  selectedItem?: { tab: TabKey | "servers" | "info"; key: string } | null;
}

/**
 * Shared wiring between a spec's section descriptors and the Navigation
 * mechanics, previously duplicated verbatim by the AsyncAPI and OpenAPI
 * adapters: routes "servers" item clicks to their own handler, keeps Info
 * clicks from being treated as a tab switch, and narrows Navigation's
 * stringly-typed callbacks back to the spec's tab union.
 */
export default function SpecNavigation<TabKey extends string>({
  sections,
  activeTab,
  onTabChange,
  onItemSelect,
  onSelectServer,
  selectedItem,
}: SpecNavigationProps<TabKey>) {
  return (
    <Navigation
      sections={sections}
      activeSection={activeTab}
      onTabChange={(id) => onTabChange(id as TabKey)}
      onItemSelect={(sectionId, key) => {
        // Info has nothing to "select" beyond the scroll navigate() already
        // does: routing it into onItemSelect (which casts to TabKey) would
        // wrongly set the active tab to "info", blanking the tab content.
        if (sectionId === "info") return;
        if (sectionId === "servers") onSelectServer?.(key);
        else onItemSelect?.(sectionId as TabKey, key);
      }}
      selectedItem={selectedItem ? { section: selectedItem.tab, key: selectedItem.key } : null}
    />
  );
}
