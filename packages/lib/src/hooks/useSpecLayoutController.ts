import { useEffect, useState } from "react";
import { ContentTabItem } from "../components/ContentTab";
import { SearchEntry } from "../helpers/searchIndex";
import { clearSearchHighlight } from "../helpers/textHighlight";
import { useSearchResultFocus, ActiveHighlight } from "./useSearchResultFocus";

export interface SchemaFocusTarget {
  tokens: string[];
  id: string;
}

export interface LayoutSection<TabKey extends string> {
  id: TabKey | "servers";
  /** Config `show` flag for this section: a hidden section reads back a null selection. */
  visible: boolean;
}

export interface SpecLayoutControllerOptions<TabKey extends string> {
  /** Content tabs currently visible (already filtered by config.show). */
  tabs: ContentTabItem[];
  /** Tab to fall back to when no tabs are visible or the stored tab gets hidden. */
  defaultTab: TabKey;
  isTabKey: (value: string) => value is TabKey;
  /**
   * Selectable sections in nav priority order: the tab keys, then "servers".
   * Must keep a constant length across renders (it feeds a hook dependency list).
   */
  sections: readonly LayoutSection<TabKey>[];
  /** Current search input, used to tag highlights and clear them when it empties. */
  searchQuery: string;
}

/**
 * Owns the tab/selection/search-focus state machine shared by the AsyncAPI and
 * OpenAPI layouts, which previously duplicated it verbatim. Each layout
 * supplies only its tab definitions, section visibility, and content
 * renderers; everything about "what is selected where, and what should scroll
 * into view" lives here.
 */
export function useSpecLayoutController<TabKey extends string>({
  tabs,
  defaultTab,
  isTabKey,
  sections,
  searchQuery,
}: SpecLayoutControllerOptions<TabKey>) {
  type SectionId = TabKey | "servers";

  const firstTab = (tabs[0]?.id ?? defaultTab) as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(firstTab);
  const [focusedNavSection, setFocusedNavSection] = useState<SectionId | null>(null);
  const focusTab = (tab: TabKey) => {
    setActiveTab(tab);
    setFocusedNavSection(tab);
  };

  const [rawSelected, setRawSelected] = useState<Partial<Record<SectionId, string | null>>>({});

  // `activeTab` and the selections can go stale when a live config edit hides
  // their section (e.g. `show.operations: false` while Operations is active),
  // so clamp them to the currently visible sections instead of trusting the
  // stored state.
  const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : firstTab;
  const selected = {} as Record<SectionId, string | null>;
  for (const section of sections) {
    selected[section.id] = section.visible ? rawSelected[section.id] ?? null : null;
  }

  /** Set one section's selection without touching the others (for in-content selection). */
  const setSelectedKey = (section: SectionId, key: string | null) =>
    setRawSelected((prev) => ({ ...prev, [section]: key }));

  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [schemaFocusTarget, setSchemaFocusTarget] = useState<SchemaFocusTarget | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);

  const handleSearchSelect = (entry: SearchEntry) => {
    if (isTabKey(entry.tab)) {
      focusTab(entry.tab);
    } else if (entry.tab === "servers") {
      setFocusedNavSection("servers");
    }
    const next: Partial<Record<SectionId, string | null>> = {};
    for (const section of sections) {
      next[section.id] = section.id === entry.tab ? entry.key : null;
    }
    setRawSelected(next);
    setFocusSection(entry.focusSection ?? null);
    // "schemas" renders as a schema tree in both specs: it scrolls via focus
    // tokens instead of text highlighting.
    setSchemaFocusTarget(
      entry.tab === "schemas" && entry.schemaFocusTokens
        ? { tokens: entry.schemaFocusTokens, id: entry.targetId }
        : null,
    );
    if (entry.tab === "schemas") clearSearchHighlight();
    setActiveHighlight({ targetId: entry.targetId, query: searchQuery, highlight: entry.tab !== "schemas" });
  };

  const handleNavItemSelect = (tab: TabKey, key: string) => {
    focusTab(tab);
    // Exclusive among the tab sections; the server selection is left alone.
    setRawSelected((prev) => {
      const next = { ...prev };
      for (const section of sections) {
        if (section.id !== "servers") next[section.id] = section.id === tab ? key : null;
      }
      return next;
    });
  };

  const handleNavServerSelect = (key: string) => {
    setFocusedNavSection("servers");
    const next: Partial<Record<SectionId, string | null>> = {};
    for (const section of sections) {
      next[section.id] = section.id === "servers" ? key : null;
    }
    setRawSelected(next);
  };

  const handleContentTabChange = (id: string) => {
    if (isTabKey(id)) focusTab(id);
  };

  const selectedNavItem = (() => {
    for (const section of sections) {
      const key = selected[section.id];
      if (key) return { tab: section.id, key };
    }
    return null;
  })();

  useSearchResultFocus(activeHighlight, [
    effectiveTab,
    focusSection,
    schemaFocusTarget,
    ...sections.map((section) => selected[section.id]),
  ]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveHighlight(null);
      clearSearchHighlight();
    }
  }, [searchQuery]);

  useEffect(() => clearSearchHighlight, []);

  return {
    effectiveTab,
    focusTab,
    /** What the sidebar nav should show as active: the focused section, falling back to the content tab. */
    navActiveSection: focusedNavSection ?? effectiveTab,
    /** Per-section selections, clamped to visible sections. */
    selected,
    setSelectedKey,
    selectedNavItem,
    handleSearchSelect,
    handleNavItemSelect,
    handleNavServerSelect,
    handleContentTabChange,
    focusSection,
    schemaFocusTarget,
  };
}
