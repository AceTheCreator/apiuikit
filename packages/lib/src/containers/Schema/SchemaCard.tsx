import SchemaTree from "../../components/schema/SchemaTree";
import {
  schemaFormatBadge,
  schemaFormatName,
  ResolvedSchemaInput,
} from "../../helpers/schemaFormat";
import { SchemaViewer } from "./SchemaViewer";

interface SchemaCardProps {
  schemaName: string;
  /** The entry after resolveSchemaInput — multi-format wrappers normalized for rendering. */
  resolved: ResolvedSchemaInput;
  /** DOM id for search/sidebar anchors. The list uses `schema-<name>`; a standalone card has none by default so it can't collide with the list's. */
  anchorId?: string;
  /** Highlights the card, and lets `focusTarget` reach into its tree. */
  selected?: boolean;
  /** The precisely-matched nested node search navigated to, if any — see Layout.tsx. */
  focusTarget?: { tokens: string[]; id: string } | null;
}

/** One `components.schemas` entry: name, description, badges, and its tree. */
export default function SchemaCard({ schemaName, resolved, anchorId, selected = false, focusTarget = null }: SchemaCardProps) {
  const schema = resolved.schema;
  const formatBadge = schemaFormatBadge(resolved.schemaFormat);
  // Top-level property count only.
  // IMP: Nested properties are not expanded here .
  const propertyCount = schema.properties
    ? Object.keys(schema.properties).length
    : 0;

  return (
    <article
      id={anchorId}
      className={`rounded-xl border bg-surface p-5 shadow-sm transition-colors ${
        selected ? "border-primary-300 ring-1 ring-primary-200" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {schemaName}
          </h3>
          {resolved.description && (
            <p className="mt-1 text-sm text-foreground-secondary">
              {resolved.description}
            </p>
          )}
        </div>
        <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {schema.type ?? "unknown"}
        </span>
      </div>
      {(schema.format || formatBadge || propertyCount > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground-secondary">
          {schema.format && (
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              Format: {schema.format}
            </span>
          )}
          {formatBadge && (
            <span
              className="rounded-full bg-neutral-100 px-3 py-1"
              title={resolved.schemaFormat}
            >
              {formatBadge}
            </span>
          )}
          {propertyCount > 0 && (
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              {propertyCount} properties
            </span>
          )}
        </div>
      )}
      {resolved.conversionError && (
        <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          Could not convert{" "}
          {schemaFormatName(resolved.schemaFormat) ?? "the"} schema —
          showing raw definition. {resolved.conversionError}
        </p>
      )}
      {resolved.pendingConversion && (
        <p className="mt-4 text-xs text-foreground-muted">
          Loading Protobuf definition…
        </p>
      )}
      {/* String sources (e.g. raw .proto text) can't be shown as a tree;
          fall back to the raw definition the warning above refers to. */}
      {resolved.pendingConversion ? null : resolved.conversionError &&
      typeof resolved.originalSchema === "string" ? (
        <div className="mt-4">
          <SchemaViewer schema={resolved.originalSchema} />
        </div>
      ) : (
        <SchemaTree
          schema={schema}
          rootName={schemaName}
          className="mt-4"
          focusTokens={selected ? focusTarget?.tokens ?? null : null}
          focusId={selected ? focusTarget?.id ?? null : null}
        />
      )}
    </article>
  );
}
