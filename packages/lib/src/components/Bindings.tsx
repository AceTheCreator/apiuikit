import CollapsiblePanel from "./CollapsiblePanel";
import Markdown from "./Markdown";
import { PROTOCOL_META } from "../contants";
import { isUrl } from "../helpers/common";

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^(.)/, (c) => c.toUpperCase())
    .trim();
}

function BindingValue({ value }: { value: unknown }): React.ReactElement | null {
  if (value === undefined || value === null) return null;

  if (typeof value === "string" && isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 underline underline-offset-2 break-all hover:text-blue-800"
      >
        {value}
      </a>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span className={`text-xs font-medium ${value ? "text-green-600" : "text-red-500"}`}>
        {value ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="text-xs font-mono text-blue-600">{value}</span>;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("type" in obj && Array.isArray(obj.enum)) {
      return (
        <div className="flex flex-wrap gap-1">
          {(obj.enum as unknown[]).map((v, i) => (
            <span key={i} className="text-xs font-mono bg-neutral-100 text-foreground-secondary px-1.5 py-0.5 rounded">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
    // A JSON-Schema-like property descriptor (e.g. Kafka's `x-*` binding
    // extensions: `{ type: "string", description: "..." }`) — the type is
    // implementation noise here, so just show the description text.
    if (
      typeof obj.type === "string" &&
      typeof obj.description === "string" &&
      Object.keys(obj).length === 2
    ) {
      return <Markdown className="prose-sm">{obj.description}</Markdown>;
    }
    return (
      <div className="mt-1 border-l-2 border-border pl-3 space-y-2">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-xs text-foreground-muted shrink-0 w-36">{prettyKey(k)}</span>
            <BindingValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-xs text-foreground-secondary">{String(value)}</span>;
}

interface Props {
  bindings: Record<string, unknown>;
  expand?: boolean;
  protocol: string;
  /** Forces this block open — e.g. when search navigates directly to it. */
  focused?: boolean;
}

export default function Bindings({ bindings, expand = false, protocol, focused }: Props) {
  const meta = PROTOCOL_META[protocol.toLowerCase()] ?? { label: protocol, color: "bg-neutral-100 text-foreground-secondary border-border" };

  const entries = Object.entries(bindings ?? {}).filter(
    ([k, v]) => k !== "bindingVersion" && v !== undefined && v !== null
  );

  if (entries.length === 0) return null;

  return (
    <CollapsiblePanel
      className="mt-2"
      defaultExpanded={expand}
      forceExpanded={focused}
      trigger={
        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${meta.color}`}>
          {meta.label}
        </span>
      }
    >
      <div className="divide-y divide-neutral-100">
        {entries.length === 0 ? (
          <p className="px-4 py-3 text-xs text-foreground-muted italic">No binding properties defined.</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex items-center items-start gap-4 px-4 py-3">
              <span className="text-xs font-medium text-foreground-muted w-40 shrink-0 pt-0.5">
                {prettyKey(key)}
              </span>
              <div className="flex-1 min-w-0">
                <BindingValue value={value} />
              </div>
            </div>
          ))
        )}
      </div>
    </CollapsiblePanel>
  );
}
