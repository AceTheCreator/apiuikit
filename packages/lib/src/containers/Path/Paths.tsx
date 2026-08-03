import { useMemo } from "react";
import Section from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import { ChannelAddress, ChannelAddressParameterDetail } from "../../components/ChannelAddress";
import MethodBadge from "../../components/MethodBadge";
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
}: PathsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);

  const endpoints = useMemo(() => flattenEndpoints(paths), [paths]);

  if (endpoints.length === 0) {
    return null;
  }

  const selected = selectedKey ? endpoints.find((e) => e.key === selectedKey) : null;
  const selectedOp = selected ? paths[selected.path]?.[selected.method] : null;

  const rows = endpoints.map(({ key, method, path }) => {
    const isSelected = selectedKey === key;
    const rowParameters = resolveOperationParameters(paths[path], paths[path]?.[method]);
    return (
      <tr
        key={key}
        id={`${idPrefix}-${key}`}
        onClick={() => setSelectedKey(key)}
        role="button"
        tabIndex={0}
        aria-label={`${method.toUpperCase()} ${path}`}
        aria-current={isSelected ? "true" : undefined}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setSelectedKey(key);
        }}
        className={`group cursor-pointer ${isSelected ? "bg-neutral-50" : ""}`}
      >
        <td className="px-6 py-2 max-w-0 w-full group-hover:bg-neutral-50">
          <ChannelAddress
            address={path}
            parameters={toChannelAddressParameters(rowParameters)}
            truncate
            className="text-xs"
          />
        </td>
        <td className="px-6 py-2 w-28 group-hover:bg-neutral-50">
          <MethodBadge method={method} className="w-20" />
        </td>
      </tr>
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
        <tbody className="bg-surface divide-y divide-border">{rows}</tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="flex justify-center w-full">
        <Section content={content} stickySideContent={false} />
      </div>

      <SidePanel isOpen={!!selected} side="right" onClose={() => setSelectedKey(null)} title={panelTitle}>
        {selected && selectedOp && (
          <PathOperation
            method={selected.method}
            path={selected.path}
            op={{ ...selectedOp, parameters: operationParameters }}
            id={selected.key}
            idPrefix={idPrefix}
            globalSecurity={security}
            securitySchemes={securitySchemes}
          />
        )}
      </SidePanel>
    </>
  );
}
