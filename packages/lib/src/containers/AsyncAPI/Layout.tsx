import { useState } from "react";
import AsyncAPIDocumentProvider from "./AsyncAPIDocumentProvider";
import ContentTab, { ContentTabItem } from "../../components/ContentTab";
import DocumentTopBar from "../../components/DocumentTopBar";
import { AsyncAPINavigation, NavTab } from "../../components/Navigation";
import SearchPanel from "../../components/SearchPanel";
import MarkdownExportMenu from "../../components/MarkdownExportMenu";
import { useSpecSearch } from "../../hooks/useSpecSearch";
import { useSpecLayoutController } from "../../hooks/useSpecLayoutController";
import { asyncApiToMarkdown } from "../../helpers/toMarkdown";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { ConfigInterface } from "../../config";
import type { ApiuikitPlugin } from "../../plugins/types";
import IconMessage from "../../icons/Message";
import IconOperation from "../../icons/Operation";
import IconSchema from "../../icons/Schema";
import Information from "../Information/Information";
import {
  hasInformationLogo,
  InformationLogo,
} from "../Information/InformationSection";
import Messages from "../Messages/Messages";
import Servers from "../Server/Servers";
import Operations from "../Operation/Operations";
import Schemas from "../Schema/Schemas";
import { AsyncAPIDocumentData } from "../../types/schema";

export interface LayoutProps {
  asyncapi: AsyncAPIDocumentData;
  config: ConfigInterface;
  plugins?: ApiuikitPlugin[];
}

type AsyncAPITabKey = NavTab;

const isAsyncAPITabKey = (value: string): value is AsyncAPITabKey =>
  value === "operations" || value === "messages" || value === "schemas";

export default function Layout({ asyncapi, config, plugins }: LayoutProps) {
  const show = config.show ?? {};
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMarkdownOpen, setIsMarkdownOpen] = useState(false);
  const hasTopControls = show.search !== false || show.copyMarkdown !== false;
  const hasTopLogo = show.info !== false && hasInformationLogo(asyncapi.info);
  const hasMasthead = hasTopControls || hasTopLogo;

  const tabs: ContentTabItem[] = [
    ...(show.operations !== false ? [{ id: "operations", name: "Operations", icon: IconOperation }] : []),
    ...(show.messages   !== false ? [{ id: "messages",   name: "Messages",   icon: IconMessage   }] : []),
    ...(show.schemas    !== false ? [{ id: "schemas",    name: "Schemas",    icon: IconSchema    }] : []),
  ];

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useSpecSearch(asyncapi, { threshold: 0.3, limit: 20 });

  const {
    effectiveTab,
    focusTab,
    navActiveSection,
    selected,
    setSelectedKey,
    selectedNavItem,
    handleSearchSelect,
    handleNavItemSelect,
    handleNavServerSelect,
    handleContentTabChange,
    focusSection,
    schemaFocusTarget,
  } = useSpecLayoutController<AsyncAPITabKey>({
    tabs,
    defaultTab: "operations",
    isTabKey: isAsyncAPITabKey,
    sections: [
      { id: "operations", visible: show.operations !== false },
      { id: "messages", visible: show.messages !== false },
      { id: "schemas", visible: show.schemas !== false },
      { id: "servers", visible: show.servers !== false },
    ],
    searchQuery,
  });

  const serverNames = asyncapi.servers ? Object.keys(asyncapi.servers) : [];

  const activeContent =
    effectiveTab === "operations" ? (
      <Operations
        operations={asyncapi.operations ?? {}}
        selectedKey={selected.operations}
        onSelectKey={(key) => setSelectedKey("operations", key)}
        focusSection={focusSection}
      />
    ) : effectiveTab === "messages" ? (
      <Messages
        messages={(asyncapi.components?.messages ?? {}) as Record<string, MessageObject>}
        selectedKey={selected.messages}
        focusSection={focusSection}
      />
    ) : effectiveTab === "schemas" ? (
      <Schemas
        schemas={asyncapi.components?.schemas ?? {}}
        selectedKey={selected.schemas}
        focusTarget={schemaFocusTarget}
      />
    ) : null;

  return (
    <AsyncAPIDocumentProvider document={asyncapi} config={config} plugins={plugins}>
      <div className={`px-4 ${hasMasthead && tabs.length > 0 ? "pt-14" : ""}`}>
        {hasMasthead && (
          <DocumentTopBar
            logo={hasTopLogo ? <InformationLogo source={asyncapi.info} /> : undefined}
            forceVisible={isSearchOpen || isMarkdownOpen}
          >
            {show.search !== false && (
              <SearchPanel
                query={searchQuery}
                onQueryChange={setSearchQuery}
                results={searchResults}
                onSelectResult={handleSearchSelect}
                onOpenChange={setIsSearchOpen}
              />
            )}
            {show.copyMarkdown !== false && (
              <MarkdownExportMenu
                serialize={(deref) => asyncApiToMarkdown(asyncapi, deref)}
                onOpenChange={setIsMarkdownOpen}
              />
            )}
          </DocumentTopBar>
        )}
        {show.info !== false && (
          <div id="info-panel">
            <Information {...asyncapi.info} showLogo={false} />
          </div>
        )}
        {show.servers !== false && serverNames.length > 0 && (
          <div id={`server-${selected.servers ?? serverNames[0]}`}>
            <Servers
              servers={asyncapi.servers!}
              selectedServer={selected.servers}
              onSelectServer={(key) => setSelectedKey("servers", key)}
              focusSection={focusSection}
            />
          </div>
        )}
        {show.sidebar !== false && (
          <AsyncAPINavigation
            operations={show.operations !== false ? asyncapi.operations : undefined}
            messages={
              show.messages !== false
                ? (asyncapi.components?.messages as Record<string, MessageObject>)
                : undefined
            }
            schemas={
              show.schemas !== false
                ? (asyncapi.components?.schemas as Record<string, unknown>)
                : undefined
            }
            servers={show.servers !== false ? asyncapi.servers : undefined}
            hasInfo={show.info !== false}
            sidebarConfig={config.sidebar}
            activeTab={navActiveSection}
            onTabChange={focusTab}
            onItemSelect={handleNavItemSelect}
            onSelectServer={handleNavServerSelect}
            selectedItem={selectedNavItem}
          />
        )}
        <ContentTab tabs={tabs} current={effectiveTab} onChange={handleContentTabChange} />
        {effectiveTab && (
          <div id={`panel-${effectiveTab}`} role="tabpanel" aria-labelledby={`tab-${effectiveTab}`}>
            {activeContent}
          </div>
        )}
      </div>
    </AsyncAPIDocumentProvider>
  );
}
