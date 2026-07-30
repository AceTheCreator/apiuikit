import { useMemo } from "react";
import { ChannelAddress } from "../ChannelAddress";
import MethodBadge from "../MethodBadge";
import { flattenEndpoints, FlatEndpoint, OpenAPIPathItemData } from "../../types/openapi";
import Navigation, { defineNavSection, ErasedNavSection } from "./Navigation";
import IconBookOpen from "../../icons/BookOpen";
import IconServer from "../../icons/Server";
import IconOperation from "../../icons/Operation";
import IconSchema from "../../icons/Schema";

export type OpenAPINavTab = "endpoints" | "schemas";
// Servers and Info aren't switchable tabs (they're always on screen, above
// the tabs) — but they need the same "find it in the sidebar, jump straight
// to it" path as everything else, so they're sections here without being a
// OpenAPINavTab.
export type OpenAPINavSectionId = OpenAPINavTab | "servers" | "info";

interface OpenAPINavigationProps {
  paths?: Record<string, OpenAPIPathItemData | undefined>;
  schemas?: Record<string, unknown>;
  servers?: string[];
  /** Whether the Info panel is currently shown — controls only whether its tick appears here, mirroring the Layout's own `show.info` gate. */
  hasInfo?: boolean;
  activeTab: OpenAPINavSectionId | null;
  onTabChange: (tab: OpenAPINavTab) => void;
  onItemSelect?: (tab: OpenAPINavTab, key: string) => void;
  onSelectServer?: (key: string) => void;
  selectedItem?: { tab: OpenAPINavSectionId; key: string } | null;
}

interface ServerNavItem {
  key: string;
  url: string;
}

// Stable fallbacks for omitted props — `= {}` / `= []` defaults would mint a
// fresh identity every render and invalidate the `sections` memo (and,
// through it, Navigation's scroll-spy observer) for nothing.
const EMPTY_PATHS: Record<string, OpenAPIPathItemData | undefined> = {};
const EMPTY_SCHEMAS: Record<string, unknown> = {};
const EMPTY_SERVERS: string[] = [];

export default function OpenAPINavigation({
  paths = EMPTY_PATHS,
  schemas = EMPTY_SCHEMAS,
  servers = EMPTY_SERVERS,
  hasInfo = true,
  activeTab,
  onTabChange,
  onItemSelect,
  onSelectServer,
  selectedItem,
}: OpenAPINavigationProps) {
  const endpoints = useMemo(() => flattenEndpoints(paths), [paths]);

  // Memoized so Navigation's scroll-spy observer (keyed on `sections`
  // identity) and its element memos survive unrelated Layout re-renders
  // (search typing, selection changes, ...) instead of rebuilding each time.
  const sections: ErasedNavSection[] = useMemo(() => {
  const serverItems: ServerNavItem[] = servers.map((url, index) => ({ key: `server-${index}`, url }));

  return [
    defineNavSection<string>({
      id: "info",
      label: "Info",
      icon: IconBookOpen,
      isTab: false,
      // A tick worth having (and worth tracking on scroll), but there's
      // nothing to expand into beyond "scroll to the top" — no popover entry.
      showInPopover: false,
      items: hasInfo ? ["info"] : [],
      itemKey: () => "info",
      targetId: () => "info-panel",
      renderItem: () => <span className="truncate">Overview</span>,
    }),
    defineNavSection<ServerNavItem>({
      id: "servers",
      label: "Servers",
      icon: IconServer,
      isTab: false,
      items: serverItems,
      itemKey: (server) => server.key,
      targetId: (server) => server.key,
      renderItem: (server) => <span className="truncate">{server.url}</span>,
    }),
    defineNavSection<FlatEndpoint>({
      id: "endpoints",
      label: "Endpoints",
      icon: IconOperation,
      items: endpoints,
      itemKey: (endpoint) => endpoint.key,
      targetId: (endpoint) => `endpoint-${endpoint.key}`,
      renderItem: (endpoint) => (
        <>
          <MethodBadge method={endpoint.method} size="xs" className="shrink-0" />
          <ChannelAddress address={endpoint.path} className="text-xs bg-transparent p-0" />
        </>
      ),
    }),
    defineNavSection<string>({
      id: "schemas",
      label: "Schemas",
      icon: IconSchema,
      items: Object.keys(schemas),
      itemKey: (name) => name,
      targetId: (name) => `schema-${name}`,
      renderItem: (name) => <span className="truncate">{name}</span>,
    }),
  ];
  }, [endpoints, schemas, servers, hasInfo]);

  return (
    <Navigation
      sections={sections}
      activeSection={activeTab}
      onTabChange={(id) => onTabChange(id as OpenAPINavTab)}
      onItemSelect={(sectionId, key) => {
        // Info has nothing to "select" beyond the scroll navigate() already
        // does — routing it into onItemSelect (which casts to OpenAPINavTab)
        // would wrongly set activeTab to "info", blanking the tab content.
        if (sectionId === "info") return;
        if (sectionId === "servers") onSelectServer?.(key);
        else onItemSelect?.(sectionId as OpenAPINavTab, key);
      }}
      selectedItem={selectedItem ? { section: selectedItem.tab, key: selectedItem.key } : null}
    />
  );
}
