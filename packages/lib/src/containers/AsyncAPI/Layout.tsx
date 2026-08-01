import { useEffect, useState } from "react";
import AsyncAPIDocumentProvider from "./AsyncAPIDocumentProvider";
import ContentTab, { ContentTabItem } from "../../components/ContentTab";
import Navigation, { NavSectionId } from "../../components/Navigation";
import SearchPanel from "../../components/SearchPanel";
import MarkdownExportMenu from "../../components/MarkdownExportMenu";
import { useSpecSearch } from "../../hooks/useSpecSearch";
import { useSearchResultFocus, ActiveHighlight } from "../../hooks/useSearchResultFocus";
import { SearchEntry } from "../../helpers/searchIndex";
import { clearSearchHighlight } from "../../helpers/textHighlight";
import { asyncApiToMarkdown } from "../../helpers/toMarkdown";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { ConfigInterface } from "../../config";
import IconMessage from "../../icons/Message";
import IconOperation from "../../icons/Operation";
import IconSchema from "../../icons/Schema";
import Information from "../Information/Information";
import Messages from "../Messages/Messages";
import Servers from "../Server/Servers";
import Operations from "../Operation/Operations";
import Schemas from "../Schema/Schemas";
import { AsyncAPIDocumentData } from "../../types/schema";

export interface LayoutProps {
  asyncapi: AsyncAPIDocumentData;
  config: ConfigInterface;
}

type AsyncAPITabKey = "operations" | "messages" | "schemas";

const isAsyncAPITabKey = (value: string): value is AsyncAPITabKey =>
  value === "operations" || value === "messages" || value === "schemas";

export default function Layout({ asyncapi, config }: LayoutProps) {
  const show = config.show ?? {};

  const tabs: ContentTabItem[] = [
    ...(show.operations !== false ? [{ id: "operations", name: "Operations", icon: IconOperation }] : []),
    ...(show.messages   !== false ? [{ id: "messages",   name: "Messages",   icon: IconMessage   }] : []),
    ...(show.schemas    !== false ? [{ id: "schemas",    name: "Schemas",    icon: IconSchema    }] : []),
  ];

  const firstTab = (tabs[0]?.id ?? "operations") as AsyncAPITabKey;
  const [activeTab, setActiveTab] = useState<AsyncAPITabKey>(firstTab);
  const [focusedNavSection, setFocusedNavSection] = useState<NavSectionId | null>(null);
  const focusTab = (tab: AsyncAPITabKey) => {
    setActiveTab(tab);
    setFocusedNavSection(tab);
  };
  const [rawSelectedOperationKey, setSelectedOperationKey] = useState<string | null>(null);
  const [rawSelectedMessageKey, setSelectedMessageKey] = useState<string | null>(null);
  const [rawSelectedSchemaKey, setSelectedSchemaKey] = useState<string | null>(null);
  const [rawSelectedServerKey, setSelectedServerKey] = useState<string | null>(null);

  // `activeTab` and the selection keys can go stale when a live config edit hides
  // their tab (e.g. `show.operations: false` while Operations is active), so clamp
  // them to the currently visible tabs instead of trusting the stored state.
  const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : firstTab;
  const selectedOperationKey = show.operations !== false ? rawSelectedOperationKey : null;
  const selectedMessageKey = show.messages !== false ? rawSelectedMessageKey : null;
  const selectedSchemaKey = show.schemas !== false ? rawSelectedSchemaKey : null;
  const selectedServerKey = show.servers !== false ? rawSelectedServerKey : null;
  const serverNames = asyncapi.servers ? Object.keys(asyncapi.servers) : [];

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useSpecSearch(asyncapi, { threshold: 0.3, limit: 20 });

  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [schemaFocusTarget, setSchemaFocusTarget] = useState<{ tokens: string[]; id: string } | null>(null);

  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);

  const handleSearchSelect = (entry: SearchEntry) => {
    if (entry.tab === "operations" || entry.tab === "messages" || entry.tab === "schemas") {
      focusTab(entry.tab);
    } else if (entry.tab === "servers") {
      setFocusedNavSection("servers");
    }
    setSelectedOperationKey(entry.tab === "operations" ? entry.key : null);
    setSelectedMessageKey(entry.tab === "messages" ? entry.key : null);
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
    selectedOperationKey,
    selectedMessageKey,
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
    effectiveTab === "operations" ? (
      <Operations
        operations={asyncapi.operations ?? {}}
        selectedKey={selectedOperationKey}
        onSelectKey={setSelectedOperationKey}
        focusSection={focusSection}
        showCopyMarkdown={show.copyMarkdown !== false}
      />
    ) : effectiveTab === "messages" ? (
      <Messages
        messages={(asyncapi.components?.messages ?? {}) as Record<string, MessageObject>}
        selectedKey={selectedMessageKey}
        focusSection={focusSection}
      />
    ) : effectiveTab === "schemas" ? (
      <Schemas
        schemas={asyncapi.components?.schemas ?? {}}
        selectedKey={selectedSchemaKey}
        focusTarget={schemaFocusTarget}
      />
    ) : null;

  return (
    <AsyncAPIDocumentProvider
      document={asyncapi}
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
        {show.copyMarkdown !== false && (
          <MarkdownExportMenu
            serialize={(deref) => asyncApiToMarkdown(asyncapi, deref)}
            leftOffset={108}
          />
        )}
        {show.info !== false && (
          <div id="info-panel">
            <Information {...asyncapi.info} />
          </div>
        )}
        {show.servers !== false && serverNames.length > 0 && (
          <div id={`server-${selectedServerKey ?? serverNames[0]}`}>
            <Servers
              servers={asyncapi.servers!}
              selectedServer={selectedServerKey}
              onSelectServer={setSelectedServerKey}
              focusSection={focusSection}
            />
          </div>
        )}
        {show.sidebar !== false && (
          <Navigation
            info={asyncapi.info}
            operations={
              show.operations !== false ? asyncapi.operations : undefined
            }
            messages={
              show.messages !== false
                ? (asyncapi.components?.messages as Record<
                    string,
                    MessageObject
                  >)
                : undefined
            }
            schemas={
              show.schemas !== false
                ? (asyncapi.components?.schemas as Record<string, unknown>)
                : undefined
            }
            servers={show.servers !== false ? asyncapi.servers : undefined}
            sidebarConfig={config.sidebar}
            activeTab={focusedNavSection}
            onTabChange={focusTab}
            onItemSelect={(tab, key) => {
              focusTab(tab);
              setSelectedOperationKey(tab === "operations" ? key : null);
              setSelectedMessageKey(tab === "messages" ? key : null);
              setSelectedSchemaKey(tab === "schemas" ? key : null);
            }}
            onSelectServer={(key) => {
              setFocusedNavSection("servers");
              setSelectedOperationKey(null);
              setSelectedMessageKey(null);
              setSelectedSchemaKey(null);
              setSelectedServerKey(key);
            }}
            selectedItem={
              selectedOperationKey
                ? { tab: "operations" as const, key: selectedOperationKey }
                : selectedMessageKey
                ? { tab: "messages" as const, key: selectedMessageKey }
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
            if (isAsyncAPITabKey(id)) focusTab(id);
          }}
        />
        {effectiveTab && (
          <div
            id={`panel-${effectiveTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${effectiveTab}`}
          >
            {activeContent}
          </div>
        )}
      </div>
    </AsyncAPIDocumentProvider>
  );
}
