import { useEffect, useState } from "react";
import OpenAPIDocumentProvider from "./OpenAPIDocumentProvider";
import ContentTab, { ContentTabItem } from "../../components/ContentTab";
import OpenAPINavigation, { OpenAPINavSectionId, OpenAPINavTab } from "../../components/OpenAPINavigation";
import SearchPanel from "../../components/SearchPanel";
import { useOpenAPISearch } from "../../hooks/useOpenAPISearch";
import { useSearchResultFocus, ActiveHighlight } from "../../hooks/useSearchResultFocus";
import { SearchEntry } from "../../helpers/searchIndex";
import { clearSearchHighlight } from "../../helpers/textHighlight";
import { ConfigInterface } from "../../config";
import IconOperation from "../../icons/Operation";
import IconSchema from "../../icons/Schema";
import OpenAPIInformation from "../Information/OpenAPIInformation";
import OpenAPIServers from "../Server/OpenAPIServers";
import Paths from "../Path/Paths";
import Schemas from "../Schema/Schemas";
import { OpenAPIDocumentData } from "../../types/openapi";

export interface OpenAPILayoutProps {
  openapi: OpenAPIDocumentData;
  config: ConfigInterface;
}

type OpenAPITabKey = OpenAPINavTab;

const isOpenAPITabKey = (value: string): value is OpenAPITabKey =>
  value === "endpoints" || value === "schemas";

export default function Layout({ openapi, config }: OpenAPILayoutProps) {
  const show = config.show ?? {};

  const tabs: ContentTabItem[] = [
    ...(show.endpoints !== false ? [{ id: "endpoints", name: "Endpoints", icon: IconOperation }] : []),
    ...(show.schemas !== false ? [{ id: "schemas", name: "Schemas", icon: IconSchema }] : []),
  ];

  const firstTab = (tabs[0]?.id ?? "endpoints") as OpenAPITabKey;
  const [activeTab, setActiveTab] = useState<OpenAPITabKey>(firstTab);
  const [focusedNavSection, setFocusedNavSection] = useState<OpenAPINavSectionId | null>(null);
  const focusTab = (tab: OpenAPITabKey) => {
    setActiveTab(tab);
    setFocusedNavSection(tab);
  };
  const [rawSelectedEndpointKey, setSelectedEndpointKey] = useState<string | null>(null);
  const [rawSelectedSchemaKey, setSelectedSchemaKey] = useState<string | null>(null);
  const [rawSelectedServerKey, setSelectedServerKey] = useState<string | null>(null);

  const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : firstTab;
  const selectedEndpointKey = show.endpoints !== false ? rawSelectedEndpointKey : null;
  const selectedSchemaKey = show.schemas !== false ? rawSelectedSchemaKey : null;
  const selectedServerKey = show.servers !== false ? rawSelectedServerKey : null;
  const serverUrls = (openapi.servers ?? []).map((server) => server.url);

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useOpenAPISearch(openapi, { threshold: 0.3, limit: 20 });

  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [schemaFocusTarget, setSchemaFocusTarget] = useState<{ tokens: string[]; id: string } | null>(null);

  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);

  const handleSearchSelect = (entry: SearchEntry) => {
    if (entry.tab === "endpoints" || entry.tab === "schemas") {
      focusTab(entry.tab);
    } else if (entry.tab === "servers") {
      setFocusedNavSection("servers");
    }
    setSelectedEndpointKey(entry.tab === "endpoints" ? entry.key : null);
    setSelectedSchemaKey(entry.tab === "schemas" ? entry.key : null);
    setSelectedServerKey(entry.tab === "servers" ? entry.key : null);
    setFocusSection(entry.focusSection ?? null);
    setSchemaFocusTarget(
      entry.tab === "schemas" && entry.schemaFocusTokens
        ? { tokens: entry.schemaFocusTokens, id: entry.targetId }
        : null,
    );
    if (entry.tab === "schemas") clearSearchHighlight();
    setActiveHighlight({ targetId: entry.targetId, query: searchQuery, highlight: entry.tab !== "schemas" });
  };

  useSearchResultFocus(activeHighlight, [
    effectiveTab,
    selectedEndpointKey,
    selectedSchemaKey,
    selectedServerKey,
    focusSection,
    schemaFocusTarget,
  ]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveHighlight(null);
      clearSearchHighlight();
    }
  }, [searchQuery]);

  useEffect(() => clearSearchHighlight, []);

  const activeContent =
    effectiveTab === "endpoints" ? (
      <Paths
        paths={openapi.paths ?? {}}
        security={openapi.security}
        selectedKey={selectedEndpointKey}
        onSelectKey={setSelectedEndpointKey}
      />
    ) : effectiveTab === "schemas" ? (
      <Schemas
        schemas={openapi.components?.schemas ?? {}}
        selectedKey={selectedSchemaKey}
        focusTarget={schemaFocusTarget}
      />
    ) : null;

  return (
    <OpenAPIDocumentProvider
      document={openapi}
      config={config}
      className={show.sidebar !== false ? "pt-14" : ""}
    >
      <div className="px-4">
        {show.search !== false && (
          <SearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            onSelectResult={handleSearchSelect}
          />
        )}
        {show.info !== false && (
          <div id="info-panel">
            <OpenAPIInformation info={openapi.info} tags={openapi.tags} externalDocs={openapi.externalDocs} />
          </div>
        )}
        {show.servers !== false && serverUrls.length > 0 && (
          <div id={selectedServerKey ?? "server-0"}>
            <OpenAPIServers
              servers={openapi.servers!}
              selectedServer={selectedServerKey}
              onSelectServer={setSelectedServerKey}
            />
          </div>
        )}
        {show.sidebar !== false && (
          <OpenAPINavigation
            info={openapi.info}
            paths={show.endpoints !== false ? openapi.paths : undefined}
            schemas={show.schemas !== false ? openapi.components?.schemas : undefined}
            servers={show.servers !== false ? serverUrls : undefined}
            activeTab={focusedNavSection}
            onTabChange={focusTab}
            onItemSelect={(tab, key) => {
              focusTab(tab);
              setSelectedEndpointKey(tab === "endpoints" ? key : null);
              setSelectedSchemaKey(tab === "schemas" ? key : null);
            }}
            onSelectServer={(key) => {
              setFocusedNavSection("servers");
              setSelectedEndpointKey(null);
              setSelectedSchemaKey(null);
              setSelectedServerKey(key);
            }}
            selectedItem={
              selectedEndpointKey
                ? { tab: "endpoints" as const, key: selectedEndpointKey }
                : selectedSchemaKey
                ? { tab: "schemas" as const, key: selectedSchemaKey }
                : selectedServerKey
                ? { tab: "servers" as const, key: selectedServerKey }
                : null
            }
          />
        )}
        <ContentTab
          tabs={tabs}
          current={effectiveTab}
          onChange={(id) => {
            if (isOpenAPITabKey(id)) focusTab(id);
          }}
        />
        {effectiveTab && (
          <div id={`panel-${effectiveTab}`} role="tabpanel" aria-labelledby={`tab-${effectiveTab}`}>
            {activeContent}
          </div>
        )}
      </div>
    </OpenAPIDocumentProvider>
  );
}
