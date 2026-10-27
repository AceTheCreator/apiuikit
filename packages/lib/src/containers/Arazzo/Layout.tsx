import { useState } from "react";
import DocumentTopBar from "../../components/DocumentTopBar";
import MarkdownExportMenu from "../../components/MarkdownExportMenu";
import SearchPanel from "../../components/SearchPanel";
import { ArazzoNavigation, ArazzoNavTab } from "../../components/Navigation";
import { ContentTabItem } from "../../components/ContentTab";
import { useArazzoSearch } from "../../hooks/useArazzoSearch";
import { useSpecLayoutController, SpecLocation } from "../../hooks/useSpecLayoutController";
import { arazzoKeyAnchor, sourceAnchor } from "../../helpers/arazzoAnchors";
import { arazzoToMarkdown } from "../../helpers/arazzoToMarkdown";
import { ConfigInterface } from "../../config";
import type { ApiuikitPlugin } from "../../plugins/types";
import type { ArazzoModel } from "../../types/arazzo";
import IconOperation from "../../icons/Operation";
import { hasInformationLogo, InformationLogo } from "../Information/InformationSection";
import ArazzoDocumentProvider from "./ArazzoDocumentProvider";
import { ArazzoLinksProvider } from "./ArazzoLinks";
import { ArazzoInfoBody, ArazzoWorkflowsBody } from "./ArazzoSectionBodies";

export type ArazzoTabKey = ArazzoNavTab;

export interface ArazzoLayoutProps {
  model: ArazzoModel;
  config: ConfigInterface;
  plugins?: ApiuikitPlugin[];
  initialLocation?: SpecLocation<ArazzoTabKey> | null;
  onLocationChange?: (location: SpecLocation<ArazzoTabKey> | null) => void;
}

const isArazzoTabKey = (value: string): value is ArazzoTabKey => value === "workflows";

// One content area, so no tab strip: the controller still owns selection,
// search focus and deep links, exactly as on the OpenAPI page. Sources take
// the "servers" slot (always on screen, above the content).
const TABS: ContentTabItem[] = [{ id: "workflows", name: "Workflows", icon: IconOperation }];

const getTargetId = (section: ArazzoTabKey | "servers", key: string) =>
  section === "servers" ? sourceAnchor(key) : arazzoKeyAnchor(key);

export default function Layout({ model, config, plugins, initialLocation, onLocationChange }: ArazzoLayoutProps) {
  const show = config.show ?? {};
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMarkdownOpen, setIsMarkdownOpen] = useState(false);
  const hasTopLogo = show.info !== false && hasInformationLogo(model.info);
  const hasMasthead = show.search !== false || show.copyMarkdown !== false || hasTopLogo;

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } = useArazzoSearch(model, {
    threshold: 0.3,
    limit: 20,
  });

  const {
    focusTab,
    navActiveSection,
    selected,
    setSelectedKey,
    selectedNavItem,
    handleSearchSelect,
    handleNavItemSelect,
    handleNavServerSelect,
  } = useSpecLayoutController<ArazzoTabKey>({
    tabs: TABS,
    defaultTab: "workflows",
    isTabKey: isArazzoTabKey,
    sections: [
      { id: "workflows", visible: true },
      { id: "servers", visible: show.info !== false },
    ],
    searchQuery,
    initialLocation,
    onLocationChange,
    getTargetId,
  });

  return (
    <ArazzoDocumentProvider model={model} config={config} plugins={plugins}>
      <ArazzoLinksProvider scope="" selectedKey={selected.workflows} onSelect={(key) => setSelectedKey("workflows", key)}>
        <div className="px-4">
          {hasMasthead && (
            <DocumentTopBar logo={hasTopLogo ? <InformationLogo source={model.info} /> : undefined} forceVisible={isSearchOpen || isMarkdownOpen}>
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
                <MarkdownExportMenu serialize={() => arazzoToMarkdown(model)} onOpenChange={setIsMarkdownOpen} />
              )}
            </DocumentTopBar>
          )}
          {show.info !== false && <ArazzoInfoBody showLogo={false} />}
          <div id="panel-workflows">
            <ArazzoWorkflowsBody />
          </div>
          {/* Last on purpose, as on the OpenAPI page: the narrow-layout nav
              button hangs off a sticky anchor that must end the document. */}
          {show.sidebar !== false && (
            <ArazzoNavigation
              workflows={model.workflows}
              sources={show.info !== false ? model.sources : undefined}
              hasInfo={show.info !== false}
              activeTab={navActiveSection}
              onTabChange={focusTab}
              onItemSelect={handleNavItemSelect}
              onSelectSource={handleNavServerSelect}
              selectedItem={selectedNavItem}
            />
          )}
        </div>
      </ArazzoLinksProvider>
    </ArazzoDocumentProvider>
  );
}
