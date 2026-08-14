import { Fragment, useEffect, useMemo, useState } from "react";
import Section, { type SectionLayout } from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import { ChannelAddress, ChannelAddressParameterDetail } from "../../components/ChannelAddress";
import MethodBadge from "../../components/MethodBadge";
import IconArrowRight from "../../icons/ArrowRight";
import IconArrowDown from "../../icons/ArrowDown";
import {
  flattenEndpoints,
  OpenAPIParameterData,
  OpenAPIPathItemData,
  OpenAPISecuritySchemeData,
  resolveOperationParameters,
} from "../../types/openapi";
import PathOperation from "./PathOperation";

interface PathsProps {
  paths: Record<string, OpenAPIPathItemData | undefined>;
  security?: Array<Record<string, string[]>>;
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  focusSection?: string | null;
  /** Heading for the identifier column. "Webhook" for OpenAPI 3.1 webhooks, whose keys are event names rather than URL paths. */
  columnLabel?: string;
  /** Prefix for this list's DOM anchor ids, keeping webhook anchors distinct from endpoint ones for search and sidebar navigation. */
  idPrefix?: string;
  layout?: SectionLayout;
}

// Query parameters aren't otherwise visible until "Show more" is expanded —
// appending them to the address, the same way path parameters already
// appear as `{name}` chunks, surfaces them immediately in the panel header.
function addressWithQuery(path: string, parameters: OpenAPIParameterData[]): string {
  const queryParams = parameters.filter((param) => param.in === "query");
  if (queryParams.length === 0) return path;
  return `${path}?${queryParams.map((param) => `${param.name}={${param.name}}`).join("&")}`;
}

// OpenAPI carries a parameter's type/default/enum/example under its
// `schema`, not on the parameter itself — adapt it into ChannelAddress's
// tooltip shape here.
function toChannelAddressParameters(parameters: OpenAPIParameterData[]): Record<string, ChannelAddressParameterDetail> {
  const result: Record<string, ChannelAddressParameterDetail> = {};
  for (const param of parameters) {
    const schema = param.schema as { type?: string; default?: unknown; enum?: unknown[] } | undefined;
    result[param.name] = {
      description: param.description,
      type: schema?.type,
      default: schema?.default !== undefined ? String(schema.default) : undefined,
      enum: schema?.enum?.map(String),
      examples: "example" in param && param.example !== undefined ? [String(param.example)] : undefined,
    };
  }
  return result;
}

export default function Paths({
  paths,
  security,
  securitySchemes,
  selectedKey = null,
  onSelectKey,
  columnLabel = "Path",
  idPrefix = "endpoint",
  layout,
}: PathsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);

  const endpoints = useMemo(() => flattenEndpoints(paths), [paths]);

  // Tags are OpenAPI's native operation grouping mechanism. Use the first
  // tag as the operation's primary group so an operation with several tags
  // still appears only once in the table.
  const endpointGroups = useMemo(() => {
    const groups = new Map<string, typeof endpoints>();
    for (const endpoint of endpoints) {
      const label = paths[endpoint.path]?.[endpoint.method]?.tags?.[0] || "Other";
      const group = groups.get(label) ?? [];
      group.push(endpoint);
      groups.set(label, group);
    }
    return Array.from(groups, ([label, items]) => ({ label, items }));
  }, [endpoints, paths]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const allExpanded = collapsedGroups.size === 0;

  // Sidebar/search navigation can select an endpoint while its group is
  // closed. Reveal it automatically so the selected row is never hidden.
  useEffect(() => {
    if (!selectedKey) return;
    const selectedGroup = endpointGroups.find(({ items }) => items.some(({ key }) => key === selectedKey));
    if (!selectedGroup) return;
    setCollapsedGroups((current) => {
      if (!current.has(selectedGroup.label)) return current;
      const next = new Set(current);
      next.delete(selectedGroup.label);
      return next;
    });
  }, [endpointGroups, selectedKey]);

  // Response `links` name their target by operationId; map those to this
  // list's own row keys so following one just moves the panel's selection.
  // Targets outside this list (an operationId that lives in another tab, or
  // in no operation at all) are absent, and ResponseLinks renders them as
  // plain text rather than a dead link.
  const keyByOperationId = useMemo(() => {
    const map = new Map<string, string>();
    for (const { key, method, path } of endpoints) {
      const operationId = paths[path]?.[method]?.operationId;
      if (operationId) map.set(operationId, key);
    }
    return map;
  }, [endpoints, paths]);

  if (endpoints.length === 0) {
    return null;
  }

  const selected = selectedKey ? endpoints.find((e) => e.key === selectedKey) : null;
  const selectedOp = selected ? paths[selected.path]?.[selected.method] : null;

  const renderEndpointRow = ({ key, method, path }: (typeof endpoints)[number], isVisible: boolean) => {
    const isSelected = selectedKey === key;
    const rowParameters = resolveOperationParameters(paths[path], paths[path]?.[method]);
    return (
      <tr
        key={key}
        id={`${idPrefix}-${key}`}
        onClick={() => setSelectedKey(key)}
        role="button"
        tabIndex={isVisible ? 0 : -1}
        aria-hidden={!isVisible}
        aria-label={`${method.toUpperCase()} ${path}`}
        aria-current={isSelected ? "true" : undefined}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setSelectedKey(key);
        }}
        className={`group transition-[opacity,visibility] duration-300 ease-in-out ${
          isVisible ? `cursor-pointer opacity-100 visible ${isSelected ? "bg-neutral-50" : ""}` : "pointer-events-none invisible opacity-0"
        }`}
      >
        <td className={`px-6 max-w-0 w-full group-hover:bg-neutral-50 transition-[padding] duration-300 ease-in-out ${isVisible ? "py-2" : "py-0"}`}>
          <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isVisible ? "max-h-12" : "max-h-0"}`}>
            <ChannelAddress
              address={path}
              parameters={toChannelAddressParameters(rowParameters)}
              truncate
              className="text-xs"
            />
          </div>
        </td>
        <td className={`px-6 w-28 group-hover:bg-neutral-50 transition-[padding] duration-300 ease-in-out ${isVisible ? "py-2" : "py-0"}`}>
          <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isVisible ? "max-h-12" : "max-h-0"}`}>
            <MethodBadge method={method} className="w-20" />
          </div>
        </td>
      </tr>
    );
  };

  const rows = endpointGroups.map(({ label, items }, groupIndex) => {
    const isExpanded = !collapsedGroups.has(label);
    const groupId = `${idPrefix}-group-${groupIndex}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
      <Fragment key={label}>
        <tbody className="border-y border-border first:border-t-0">
          <tr className="bg-neutral-50/70">
            <th colSpan={2} scope="rowgroup" className="p-0 text-left">
              <button
                type="button"
                aria-label={`${label} endpoints (${items.length})`}
                aria-expanded={isExpanded}
                aria-controls={groupId}
                onClick={() =>
                  setCollapsedGroups((current) => {
                    const next = new Set(current);
                    if (isExpanded) next.add(label);
                    else next.delete(label);
                    return next;
                  })
                }
                className="group/header flex w-full items-center gap-3 px-6 py-3.5 text-left hover:bg-neutral-100/80 transition-colors"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground-muted shadow-sm transition-colors group-hover/header:border-neutral-300 group-hover/header:text-foreground-secondary">
                  {isExpanded ? (
                    <IconArrowDown className="h-2.5 w-2.5" />
                  ) : (
                    <IconArrowRight className="h-2.5 w-2.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-wide text-foreground-secondary">
                  {label}
                </span>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-neutral-200/70 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground-muted">
                  {items.length}
                </span>
              </button>
            </th>
          </tr>
        </tbody>
        <tbody
          id={groupId}
          aria-hidden={!isExpanded}
          className={`bg-surface ${isExpanded ? "divide-y divide-border" : ""}`}
        >
          {items.map((item) => renderEndpointRow(item, isExpanded))}
        </tbody>
      </Fragment>
    );
  });

  const operationParameters = resolveOperationParameters(selected ? paths[selected.path] : undefined, selectedOp);

  const panelTitle = selected ? (
    <div className="flex items-center gap-2 min-w-0">
      <MethodBadge method={selected.method} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <ChannelAddress
          address={addressWithQuery(selected.path, operationParameters)}
          parameters={toChannelAddressParameters(operationParameters)}
          className="text-xs"
        />
      </div>
    </div>
  ) : (
    selectedKey
  );

  const content = (
    <div>
      <div className="mb-3 flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground-secondary">
          <input
            type="checkbox"
                    checked={allExpanded}
                    onChange={(event) =>
                      setCollapsedGroups(
                        event.target.checked ? new Set() : new Set(endpointGroups.map(({ label }) => label)),
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      setCollapsedGroups(
                        allExpanded ? new Set(endpointGroups.map(({ label }) => label)) : new Set(),
                      );
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border"
          />
          <span>Expand all</span>
        </label>
      </div>
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-100 w-full">
            <tr>
              <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {columnLabel}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                Method
              </th>
            </tr>
          </thead>
          {rows}
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex justify-center w-full">
        <Section content={content} stickySideContent={false} layout={layout} />
      </div>

      <SidePanel
        isOpen={!!selected}
        side="right"
        onClose={() => setSelectedKey(null)}
        title={panelTitle}
      >
        {selected && selectedOp && (
          <PathOperation
            // Remounts on every operation switch so a `*.operation.tab` plugin
            // tab (and its internal state) doesn't carry over to a different
            // operation, and the panel always lands back on Documentation.
            key={selected.key}
            method={selected.method}
            path={selected.path}
            op={{ ...selectedOp, parameters: operationParameters }}
            id={selected.key}
            idPrefix={idPrefix}
            globalSecurity={security}
            securitySchemes={securitySchemes}
            isOperationKnown={(operationId) => keyByOperationId.has(operationId)}
            onFollowOperation={(operationId) => {
              const key = keyByOperationId.get(operationId);
              if (key) setSelectedKey(key);
            }}
          />
        )}
      </SidePanel>
    </>
  );
}
