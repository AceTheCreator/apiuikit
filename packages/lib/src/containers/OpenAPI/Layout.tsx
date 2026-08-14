import OpenAPIDocumentProvider from "./OpenAPIDocumentProvider";
import ContentTab, { ContentTabItem } from "../../components/ContentTab";
import { OpenAPINavigation, OpenAPINavTab } from "../../components/Navigation";
import SearchPanel from "../../components/SearchPanel";
import MarkdownExportMenu from "../../components/MarkdownExportMenu";
import { useOpenAPISearch } from "../../hooks/useOpenAPISearch";
import { useSpecLayoutController } from "../../hooks/useSpecLayoutController";
import { openApiToMarkdown } from "../../helpers/toMarkdown";
import { ConfigInterface } from "../../config";
import type { ApiuikitPlugin } from "../../plugins/types";
import IconConnection from "../../icons/Connection";
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
  plugins?: ApiuikitPlugin[];
}

type OpenAPITabKey = OpenAPINavTab;

const isOpenAPITabKey = (value: string): value is OpenAPITabKey =>
  value === "endpoints" || value === "webhooks" || value === "schemas";

export default function Layout({ openapi, config, plugins }: OpenAPILayoutProps) {
  const show = config.show ?? {};

  // Webhooks are 3.1-only and rare, so unlike the other tabs this one appears
  // only when the document actually declares some — an always-empty Webhooks
  // tab on every 3.0 document would be noise.
  const webhooks = openapi.webhooks ?? {};
  const hasWebhooks = Object.keys(webhooks).length > 0;

  const tabs: ContentTabItem[] = [
    ...(show.endpoints !== false ? [{ id: "endpoints", name: "Endpoints", icon: IconOperation }] : []),
    ...(hasWebhooks && show.webhooks !== false
      ? [{ id: "webhooks", name: "Webhooks", icon: IconConnection }]
      : []),
    ...(show.schemas !== false ? [{ id: "schemas", name: "Schemas", icon: IconSchema }] : []),
  ];

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useOpenAPISearch(openapi, { threshold: 0.3, limit: 20 });

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
    schemaFocusTarget,
  } = useSpecLayoutController<OpenAPITabKey>({
    tabs,
    defaultTab: "endpoints",
    isTabKey: isOpenAPITabKey,
    sections: [
      { id: "endpoints", visible: show.endpoints !== false },
      { id: "webhooks", visible: hasWebhooks && show.webhooks !== false },
      { id: "schemas", visible: show.schemas !== false },
      { id: "servers", visible: show.servers !== false },
    ],
    searchQuery,
  });

  const serverUrls = (openapi.servers ?? []).map((server) => server.url);

  const activeContent =
    effectiveTab === "endpoints" ? (
      <Paths
        paths={openapi.paths ?? {}}
        security={openapi.security}
        securitySchemes={openapi.components?.securitySchemes}
        selectedKey={selected.endpoints}
        onSelectKey={(key) => setSelectedKey("endpoints", key)}
      />
    ) : effectiveTab === "webhooks" ? (
      <Paths
        paths={webhooks}
        security={openapi.security}
        securitySchemes={openapi.components?.securitySchemes}
        selectedKey={selected.webhooks}
        onSelectKey={(key) => setSelectedKey("webhooks", key)}
        columnLabel="Webhook"
        idPrefix="webhook"
      />
    ) : effectiveTab === "schemas" ? (
      <Schemas
        schemas={openapi.components?.schemas ?? {}}
        selectedKey={selected.schemas}
        focusTarget={schemaFocusTarget}
      />
    ) : null;

  return (
    <OpenAPIDocumentProvider
      document={openapi}
      config={config}
      plugins={plugins}
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
            serialize={(deref) => openApiToMarkdown(openapi, deref)}
            // Search toggle is at 12px; sit immediately to its right when it's shown
            // (12 + 40 width + 8 gap), else take the vacated first slot.
            leftOffset={show.search !== false ? 60 : 12}
          />
        )}
        {show.info !== false && (
          <div id="info-panel">
            <OpenAPIInformation info={openapi.info} tags={openapi.tags} externalDocs={openapi.externalDocs} />
          </div>
        )}
        {show.servers !== false && serverUrls.length > 0 && (
          <div id={selected.servers ?? "server-0"}>
            <OpenAPIServers
              servers={openapi.servers!}
              selectedServer={selected.servers}
              onSelectServer={(key) => setSelectedKey("servers", key)}
            />
          </div>
        )}
        {show.sidebar !== false && (
          <OpenAPINavigation
            paths={show.endpoints !== false ? openapi.paths : undefined}
            webhooks={hasWebhooks && show.webhooks !== false ? webhooks : undefined}
            schemas={show.schemas !== false ? openapi.components?.schemas : undefined}
            servers={show.servers !== false ? serverUrls : undefined}
            hasInfo={show.info !== false}
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
    </OpenAPIDocumentProvider>
  );
}
