import { useMemo } from "react";
import { Operation } from "../../types/asyncapi/Operation";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { OperationAction } from "../../types/asyncapi/OperationAction";
import { SideBarConfig } from "../../config/config";
import { ChannelAddress } from "../ChannelAddress";
import { Parameter } from "../../types/asyncapi/Parameter";
import Navigation, { defineNavSection, ErasedNavSection } from "./Navigation";
import IconBookOpen from "../../icons/BookOpen";
import IconServer from "../../icons/Server";
import IconOperation from "../../icons/Operation";
import IconMessage from "../../icons/Message";
import IconSchema from "../../icons/Schema";

export type NavTab = "operations" | "messages" | "schemas";
// Servers and Info aren't switchable tabs (they're always on screen, above
// the tabs) — but they need the same "find it in the sidebar, jump straight
// to it" path as everything else, so they're sections here without being a
// NavTab.
export type NavSectionId = NavTab | "servers" | "info";

interface AsyncAPINavigationProps {
  operations?: Record<string, Operation>;
  messages?: Record<string, MessageObject>;
  schemas?: Record<string, unknown>;
  servers?: Record<string, unknown>;
  /** Whether the Info panel is currently shown — controls only whether its tick appears here, mirroring the Layout's own `show.info` gate. */
  hasInfo?: boolean;
  /** Which section is currently the user's focus, for header highlighting —
   * a single authoritative value covering all five sections (including
   * Info and Servers) so at most one header is ever highlighted at once.
   * Distinct from `onTabChange`, which only fires for the three switchable tabs. */
  activeTab: NavSectionId | null;
  onTabChange: (tab: NavTab) => void;
  onItemSelect?: (tab: NavTab, key: string) => void;
  onSelectServer?: (key: string) => void;
  selectedItem?: { tab: NavSectionId; key: string } | null;
  sidebarConfig?: SideBarConfig;
}

// Stable fallback for omitted props — a `= {}` default would mint a fresh
// object every render and invalidate the `sections` memo (and, through it,
// Navigation's scroll-spy observer) for nothing.
const EMPTY_RECORD: Record<string, never> = {};

export default function AsyncAPINavigation({
  operations = EMPTY_RECORD,
  messages = EMPTY_RECORD,
  schemas = EMPTY_RECORD,
  servers = EMPTY_RECORD,
  hasInfo = true,
  activeTab,
  onTabChange,
  onItemSelect,
  onSelectServer,
  selectedItem,
  sidebarConfig,
}: AsyncAPINavigationProps) {
  // Memoized so Navigation's scroll-spy observer (keyed on `sections`
  // identity) and its element memos survive unrelated Layout re-renders
  // (search typing, selection changes, ...) instead of rebuilding each time.
  const sections: ErasedNavSection[] = useMemo(() => {
  const resolveChannel = (key: string): { address?: string | null; parameters?: Record<string, Parameter> } | null => {
    if (!sidebarConfig?.useChannelAddressAsIdentifier) return null;
    // op.channel $refs are already inlined by resolveDocument / @asyncapi/parser.
    const channel: unknown = operations[key]?.channel;
    return (channel as { address?: string | null; parameters?: Record<string, Parameter> } | null) ?? null;
  };

  // Listed first to match the page's own order (Info → Servers → tabs) — and
  // because "how do I connect/authenticate" is usually the first thing
  // someone looks for, not something to bury below the tab catalogs.
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
    defineNavSection<string>({
      id: "servers",
      label: "Servers",
      icon: IconServer,
      isTab: false,
      items: Object.keys(servers),
      itemKey: (key) => key,
      targetId: (key) => `server-${key}`,
      renderItem: (key) => <span className="truncate">{key}</span>,
    }),
    defineNavSection<string>({
      id: "operations",
      label: "Operations",
      icon: IconOperation,
      items: Object.keys(operations),
      itemKey: (key) => key,
      targetId: (key) => `operation-${key}`,
      renderItem: (key) => {
        const channel = resolveChannel(key);

        // Channel address is the preferred identifier when available — shown
        // alone, no badge. The action badge + operation name is the fallback
        // for when there's no channel address to show instead.
        if (channel?.address) {
          return <ChannelAddress address={channel.address} parameters={channel.parameters} className="text-xs bg-transparent p-0" />;
        }

        const action = operations[key]?.action;
        const actionColor =
          action === OperationAction.SEND
            ? "bg-green-100 text-green-700"
            : action === OperationAction.RECEIVE
            ? "bg-blue-100 text-blue-700"
            : null;

        return (
          <>
            {actionColor && (
              <span className={`shrink-0 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${actionColor}`}>
                {action}
              </span>
            )}
            <span className="truncate">{key}</span>
          </>
        );
      },
    }),
    defineNavSection<string>({
      id: "messages",
      label: "Messages",
      icon: IconMessage,
      items: Object.keys(messages),
      itemKey: (key) => key,
      targetId: (key) => `message-${key}`,
      renderItem: (key) => <span className="truncate">{key}</span>,
    }),
    defineNavSection<string>({
      id: "schemas",
      label: "Schemas",
      icon: IconSchema,
      items: Object.keys(schemas),
      itemKey: (key) => key,
      targetId: (key) => `schema-${key}`,
      renderItem: (key) => <span className="truncate">{key}</span>,
    }),
  ];
  }, [operations, messages, schemas, servers, hasInfo, sidebarConfig]);

  return (
    <Navigation
      sections={sections}
      activeSection={activeTab}
      onTabChange={(id) => onTabChange(id as NavTab)}
      onItemSelect={(sectionId, key) => {
        // Info has nothing to "select" beyond the scroll navigate() already
        // does — routing it into onItemSelect (which casts to NavTab) would
        // wrongly set activeTab to "info", blanking the tab content.
        if (sectionId === "info") return;
        if (sectionId === "servers") onSelectServer?.(key);
        else onItemSelect?.(sectionId as NavTab, key);
      }}
      selectedItem={selectedItem ? { section: selectedItem.tab, key: selectedItem.key } : null}
    />
  );
}
