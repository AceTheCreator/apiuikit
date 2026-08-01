import { useMemo } from "react";
import Section from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import { ChannelAddress } from "../../components/ChannelAddress";
import CopyMarkdownButton from "../../components/CopyMarkdownButton";
import { useAsyncAPIDocument } from "../../contexts";
import { flattenEndpoints, OpenAPIDocumentData, OpenAPIPathItemData } from "../../types/openapi";
import { openApiEndpointToMarkdown } from "../../helpers/toMarkdown";
import PathOperation, { METHOD_BADGE_CLASSNAME } from "./PathOperation";

interface PathsProps {
  paths: Record<string, OpenAPIPathItemData | undefined>;
  security?: Array<Record<string, string[]>>;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  focusSection?: string | null;
  showCopyMarkdown?: boolean;
}

export default function Paths({ paths, security, selectedKey = null, onSelectKey, showCopyMarkdown }: PathsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);
  const { document, deref } = useAsyncAPIDocument();
  const doc = document as OpenAPIDocumentData;

  const endpoints = useMemo(() => flattenEndpoints(paths), [paths]);

  if (endpoints.length === 0) {
    return null;
  }

  const selected = selectedKey ? endpoints.find((e) => e.key === selectedKey) : null;
  const selectedOp = selected ? paths[selected.path]?.[selected.method] : null;

  const rows = endpoints.map(({ key, method, path }) => {
    const op = paths[path]?.[method];
    const isSelected = selectedKey === key;
    return (
      <tr
        key={key}
        id={`endpoint-${key}`}
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
          <ChannelAddress address={path} truncate className="text-xs" />
          {op?.summary && (
            <p className="text-xs text-foreground-muted truncate">{op.summary}</p>
          )}
        </td>
        <td className="px-6 py-2 w-28 group-hover:bg-neutral-50">
          <div
            className={`inline-flex w-20 items-center justify-center px-2 py-1 text-center rounded-md text-xs font-medium uppercase ${METHOD_BADGE_CLASSNAME[method]}`}
          >
            {method}
          </div>
        </td>
      </tr>
    );
  });

  const panelTitle = selected ? (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium uppercase ${METHOD_BADGE_CLASSNAME[selected.method]}`}
      >
        {selected.method}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <ChannelAddress address={selected.path} className="text-xs" />
      </div>
    </div>
  ) : (
    selectedKey ?? "Endpoint"
  );

  const content = (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-100 w-full">
          <tr>
            <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Path
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
        <Section title="Endpoints" content={content} stickySideContent={false} />
      </div>

      <SidePanel
        isOpen={!!selected}
        side="right"
        onClose={() => setSelectedKey(null)}
        title={panelTitle}
        headerActions={
          selected && selectedOp && showCopyMarkdown ? (
            <CopyMarkdownButton
              getMarkdown={() => openApiEndpointToMarkdown(doc, selected.method, selected.path, deref)}
              label="Copy endpoint for LLM"
            />
          ) : undefined
        }
      >
        {selected && selectedOp && (
          <PathOperation
            method={selected.method}
            path={selected.path}
            op={selectedOp}
            id={selected.key}
            globalSecurity={security}
          />
        )}
      </SidePanel>
    </>
  );
}
