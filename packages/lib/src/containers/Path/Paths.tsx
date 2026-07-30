import { useMemo } from "react";
import Section from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import { ChannelAddress } from "../../components/ChannelAddress";
import MethodBadge from "../../components/MethodBadge";
import { flattenEndpoints, OpenAPIPathItemData } from "../../types/openapi";
import PathOperation from "./PathOperation";

interface PathsProps {
  paths: Record<string, OpenAPIPathItemData | undefined>;
  security?: Array<Record<string, string[]>>;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  focusSection?: string | null;
}

export default function Paths({ paths, security, selectedKey = null, onSelectKey }: PathsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);

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
          <MethodBadge method={method} className="w-20" />
        </td>
      </tr>
    );
  });

  const panelTitle = selected ? (
    <div className="flex items-center gap-2 min-w-0">
      <MethodBadge method={selected.method} />
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

      <SidePanel isOpen={!!selected} side="right" onClose={() => setSelectedKey(null)} title={panelTitle}>
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
