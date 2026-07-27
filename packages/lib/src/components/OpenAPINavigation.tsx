import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import SidebarIcon from "../icons/SideBar";
import { SidePanel } from "./SidePanel";
import IconOperation from "../icons/Operation";
import IconSchema from "../icons/Schema";
import IconServer from "../icons/Server";
import { SideBarConfig } from "../config/config";
import { useAsyncAPIDocument } from "../contexts";
import { useAutoHideOnScroll } from "../utils/useAutoHideOnScroll";
import { useElementRect } from "../utils/useElementRect";
import { ChannelAddress } from "./ChannelAddress";
import { flattenEndpoints, OpenAPIInfoData, OpenAPIPathItemData } from "../types/openapi";
import { METHOD_BADGE_CLASSNAME } from "../containers/Path/PathOperation";

export type OpenAPINavTab = "endpoints" | "schemas";
export type OpenAPINavSectionId = OpenAPINavTab | "servers";

interface OpenAPINavigationProps {
  info: OpenAPIInfoData;
  paths?: Record<string, OpenAPIPathItemData | undefined>;
  schemas?: Record<string, unknown>;
  servers?: string[];
  activeTab: OpenAPINavSectionId | null;
  onTabChange: (tab: OpenAPINavTab) => void;
  onItemSelect?: (tab: OpenAPINavTab, key: string) => void;
  onSelectServer?: (key: string) => void;
  selectedItem?: { tab: OpenAPINavSectionId; key: string } | null;
  sidebarConfig?: SideBarConfig;
}

/** Header button + count badge + item list wrapper shared by the Servers/Endpoints/Schemas sections below — they differ only in icon, label, count, and the items rendered inside. */
function NavSectionBlock({
  label,
  icon: Icon,
  count,
  active,
  onNavigate,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pb-1">
      <button
        onClick={onNavigate}
        className={`flex items-center gap-2 w-full text-left px-2 py-2 rounded-md group transition-colors ${
          active ? "bg-primary-50" : "hover:bg-neutral-50"
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            active ? "text-primary-500" : "text-foreground-muted group-hover:text-foreground-secondary"
          }`}
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
            active ? "text-primary-600" : "text-foreground-muted group-hover:text-foreground-secondary"
          }`}
        >
          {label}
        </span>
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-foreground-muted">
          {count}
        </span>
      </button>
      <ul className="mt-0.5 space-y-0.5 pl-3 border-l border-border ml-4">{children}</ul>
    </div>
  );
}

export default function OpenAPINavigation({
  info,
  paths = {},
  schemas = {},
  servers = [],
  activeTab,
  onTabChange,
  onItemSelect,
  onSelectServer,
  selectedItem,
}: OpenAPINavigationProps) {
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(0);
  const [panelElement, setpanelElement] = useState<HTMLDivElement | null>(null);
  const { rootElement } = useAsyncAPIDocument();

  const toggleMode = useAutoHideOnScroll(rootElement, open);
  const isPinnedToViewport = toggleMode !== "docked";
  const rootRect = useElementRect(rootElement, isPinnedToViewport);

  const panelShift = open && panelWidth ? panelWidth - 2 : 0;
  const toggleStyle: React.CSSProperties = {
    transform: `translate(${panelShift}px, ${toggleMode === "hidden" ? "-150%" : "0px"})`,
    ...(isPinnedToViewport
      ? {
          position: "fixed",
          top: 10,
          left: (rootRect?.left ?? 0) + 12,
          pointerEvents: toggleMode === "hidden" ? "none" : undefined,
        }
      : {}),
  };

  useEffect(() => {
    if (!panelElement) return;
    const observer = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    observer.observe(panelElement);
    return () => observer.disconnect();
  }, [panelElement]);

  const endpoints = useMemo(() => flattenEndpoints(paths), [paths]);

  const schemaNames = Object.keys(schemas);

  const navigate = (id: OpenAPINavSectionId, itemId?: string) => {
    if (id !== "servers") onTabChange(id);
    if (itemId) {
      setTimeout(() => {
        document.getElementById(itemId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close navigation" : "Open navigation"}
        className="panel-toggle-btn bg-neutral-100"
        style={toggleStyle}
      >
        <SidebarIcon isCollapsed={open} />
      </button>

      <SidePanel ref={setpanelElement} isOpen={open} side="left" onClose={() => setOpen(false)} width="min-w-[450px] w-auto">
        <nav className="space-y-1">
          <div className="flex items-center gap-2 pb-4 mb-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground truncate">{info.title}</span>
            {info.version && (
              <span className="shrink-0 text-xs font-mono bg-primary-50 text-primary-600 border border-primary-200 px-1.5 py-0.5 rounded">
                v{info.version}
              </span>
            )}
          </div>

          {servers.length > 0 && (
            <NavSectionBlock
              label="Servers"
              icon={IconServer}
              count={servers.length}
              active={activeTab === "servers"}
              onNavigate={() => navigate("servers")}
            >
              {servers.map((url, index) => {
                const key = `server-${index}`;
                const isItemSelected = selectedItem?.tab === "servers" && selectedItem?.key === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => {
                        navigate("servers", key);
                        onSelectServer?.(key);
                      }}
                      className={`w-full text-left flex items-center gap-2 text-xs py-1.5 px-2 rounded-md transition-colors ${
                        isItemSelected
                          ? "bg-primary-50 text-primary-500 font-medium"
                          : "text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-50"
                      }`}
                    >
                      <span className="truncate">{url}</span>
                    </button>
                  </li>
                );
              })}
            </NavSectionBlock>
          )}

          {endpoints.length > 0 && (
            <NavSectionBlock
              label="Endpoints"
              icon={IconOperation}
              count={endpoints.length}
              active={activeTab === "endpoints"}
              onNavigate={() => navigate("endpoints")}
            >
              {endpoints.map(({ key, method, path }) => {
                const isItemSelected = selectedItem?.tab === "endpoints" && selectedItem?.key === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => {
                        navigate("endpoints", `endpoint-${key}`);
                        onItemSelect?.("endpoints", key);
                      }}
                      className={`w-full text-left flex items-center gap-2 text-xs py-1.5 px-2 rounded-md transition-colors ${
                        isItemSelected
                          ? "bg-primary-50 text-primary-500 font-medium"
                          : activeTab === "endpoints"
                            ? "text-foreground-secondary hover:text-foreground hover:bg-primary-50"
                            : "text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`shrink-0 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${METHOD_BADGE_CLASSNAME[method]}`}
                      >
                        {method}
                      </span>
                      <ChannelAddress address={path} className="text-xs bg-transparent p-0" />
                    </button>
                  </li>
                );
              })}
            </NavSectionBlock>
          )}

          {schemaNames.length > 0 && (
            <NavSectionBlock
              label="Schemas"
              icon={IconSchema}
              count={schemaNames.length}
              active={activeTab === "schemas"}
              onNavigate={() => navigate("schemas")}
            >
              {schemaNames.map((name) => {
                const key = `schema-${name}`;
                const isItemSelected = selectedItem?.tab === "schemas" && selectedItem?.key === name;
                return (
                  <li key={name}>
                    <button
                      onClick={() => {
                        navigate("schemas", key);
                        onItemSelect?.("schemas", name);
                      }}
                      className={`w-full text-left flex items-center gap-2 text-xs py-1.5 px-2 rounded-md transition-colors ${
                        isItemSelected
                          ? "bg-primary-50 text-primary-500 font-medium"
                          : activeTab === "schemas"
                            ? "text-foreground-secondary hover:text-foreground hover:bg-primary-50"
                            : "text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-50"
                      }`}
                    >
                      <span className="truncate">{name}</span>
                    </button>
                  </li>
                );
              })}
            </NavSectionBlock>
          )}
        </nav>
      </SidePanel>
    </>
  );
}
