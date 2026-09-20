import { useEffect, useMemo, useState } from "react";
import { ContentTabItem } from "../components/ContentTab";
import { SearchEntry } from "../helpers/searchIndex";
import { clearSearchHighlight } from "../helpers/textHighlight";
import { useSearchResultFocus, ActiveHighlight } from "./useSearchResultFocus";

export interface SchemaFocusTarget {
  tokens: string[];
  id: string;
}

/** Which section/item is selected, independent of any single spec's own tab-key union. */
export interface SpecLocation<TabKey extends string> {
  tab: TabKey | "servers";
  key: string | null;
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
  /** Selection to seed on mount (e.g. parsed from a URL hash), in place of the hardcoded defaults. */
  initialLocation?: SpecLocation<TabKey> | null;
  /** Fired whenever the effective tab/selection changes: nav clicks, tab clicks, search-select, and the initial seed. */
  onLocationChange?: (location: SpecLocation<TabKey> | null) => void;
  /**
   * Maps a section + selected key to the DOM id to scroll into view for
   * `initialLocation` on mount. Each layout already owns this id scheme
   * (idPrefixes, `schema-`/`operation-`/`message-` roots, ...), so it's
   * supplied rather than guessed here. Omit it to skip the initial scroll.
   */
  getTargetId?: (section: TabKey | "servers", key: string) => string;
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
  initialLocation,
  onLocationChange,
  getTargetId,
}: SpecLayoutControllerOptions<TabKey>) {
  type SectionId = TabKey | "servers";

  const firstTab = (tabs[0]?.id ?? defaultTab) as TabKey;
  // Runtime-validated (not just trusted from the type) since `initialLocation`
  // often comes from parsing an untrusted URL fragment: a bogus/stale tab
  // name should degrade to the default tab rather than propagate.
  const initialSectionId: SectionId | null =
    initialLocation && (initialLocation.tab === "servers" || isTabKey(initialLocation.tab))
      ? (initialLocation.tab as SectionId)
      : null;

  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    initialSectionId && initialSectionId !== "servers" ? (initialSectionId as TabKey) : firstTab,
  );
  const [focusedNavSection, setFocusedNavSection] = useState<SectionId | null>(() => initialSectionId);
  const focusTab = (tab: TabKey) => {
    setActiveTab(tab);
    setFocusedNavSection(tab);
  };

  const [rawSelected, setRawSelected] = useState<Partial<Record<SectionId, string | null>>>(() => {
    const initial: Partial<Record<SectionId, string | null>> = {};
    if (initialSectionId && initialLocation?.key) initial[initialSectionId] = initialLocation.key;
    return initial;
  });

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

  const selectedNavItem = useMemo(
    () => {
      for (const section of sections) {
        const key = selected[section.id];
        if (key) return { tab: section.id, key };
      }
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...sections.map((section) => selected[section.id])],
  );

  useSearchResultFocus(activeHighlight, [
    effectiveTab,
    focusSection,
    schemaFocusTarget,
    ...sections.map((section) => selected[section.id]),
  ]);

  // Scrolls to `initialLocation`'s target once on mount, reusing the same
  // find-and-scroll retry loop search results use (`highlight: false` since
  // this isn't a text match). Seeded via a state initializer so it stays
  // referentially stable and only re-fires if the target wasn't mounted yet.
  const [initialScrollTarget] = useState<ActiveHighlight | null>(() =>
    initialSectionId && initialLocation?.key && getTargetId
      ? { targetId: getTargetId(initialSectionId, initialLocation.key), query: "", highlight: false }
      : null,
  );
  useSearchResultFocus(initialScrollTarget, [effectiveTab]);

  useEffect(() => {
    onLocationChange?.(
      selectedNavItem ? { tab: selectedNavItem.tab, key: selectedNavItem.key } : { tab: effectiveTab, key: null },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab, selectedNavItem]);

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
