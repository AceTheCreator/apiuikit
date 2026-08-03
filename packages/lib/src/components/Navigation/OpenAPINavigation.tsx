import { useMemo } from "react";
import { ChannelAddress } from "../ChannelAddress";
import MethodBadge from "../MethodBadge";
import { flattenEndpoints, FlatEndpoint, OpenAPIPathItemData } from "../../types/openapi";
import { defineNavSection, ErasedNavSection } from "./Navigation";
import SpecNavigation from "./SpecNavigation";
import { infoNavSection, schemasNavSection } from "./sharedSections";
import IconServer from "../../icons/Server";
import IconOperation from "../../icons/Operation";

export type OpenAPINavTab = "endpoints" | "schemas";
// Servers and Info aren't switchable tabs (they're always on screen, above
// the tabs), but they need the same "find it in the sidebar, jump straight
// to it" path as everything else, so they're sections here without being a
// OpenAPINavTab.
export type OpenAPINavSectionId = OpenAPINavTab | "servers" | "info";

interface OpenAPINavigationProps {
  paths?: Record<string, OpenAPIPathItemData | undefined>;
  schemas?: Record<string, unknown>;
  servers?: string[];
  /** Whether the Info panel is currently shown: controls only whether its tick appears here, mirroring the Layout's own `show.info` gate. */
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

// Stable fallbacks for omitted props: `= {}` / `= []` defaults would mint a
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
    infoNavSection(hasInfo),
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
    schemasNavSection(schemas),
  ];
  }, [endpoints, schemas, servers, hasInfo]);

  return (
    <SpecNavigation<OpenAPINavTab>
      sections={sections}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onItemSelect={onItemSelect}
      onSelectServer={onSelectServer}
      selectedItem={selectedItem}
    />
  );
}
