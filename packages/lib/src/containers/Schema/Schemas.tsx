import { useMemo } from "react";
import SchemaTree from "../../components/schema/SchemaTree";
import Section from "../../components/Section";
import { SchemaNodeData } from "../../types/schema";
import {
  resolveSchemaInput,
  schemaFormatBadge,
  schemaFormatName,
  ResolvedSchemaInput,
} from "../../helpers/schemaFormat";
import { useProtobufConverterReady } from "../../helpers/protobuf/lazyProtoToJsonSchema";
import { SchemaViewer } from "./SchemaViewer";
import { useAsyncAPIDocument } from "../../contexts";

interface SchemasProps {
  schemas: Record<string, SchemaNodeData>;
  selectedKey?: string | null;
  /** The precisely-matched nested node search navigated to, if any — see Layout.tsx. */
  focusTarget?: { tokens: string[]; id: string } | null;
}

export default function Schemas({ schemas, selectedKey, focusTarget }: SchemasProps) {
  const { deref } = useAsyncAPIDocument();
  // Re-resolves once the (lazy-loaded) Protobuf converter becomes available —
  // see lazyProtoToJsonSchema.ts.
  const protobufReady = useProtobufConverterReady();

  // v3 components.schemas entries can be multi-format wrappers
  // ({ schemaFormat, schema }) — normalize each entry for rendering.
  const schemaEntries = useMemo<[string, ResolvedSchemaInput][]>(
    () =>
      Object.entries(schemas).map(([schemaName, schema]) => [
        schemaName,
        resolveSchemaInput(schema, deref),
      ]),
    // protobufReady isn't read in the body, but resolveSchemaInput's result
    // silently depends on it via module-level state (lazyProtoToJsonSchema.ts)
    // — the memo must invalidate when it flips or a pending conversion never re-resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schemas, deref, protobufReady],
  );

  const content = schemaEntries.length ? (
    <div className="grid gap-6 w-full">
      {schemaEntries.map(([schemaName, resolved]) => {
        const schema = resolved.schema;
        const formatBadge = schemaFormatBadge(resolved.schemaFormat);
        // Top-level property count only.
        // IMP: Nested properties are not expanded here .
        const propertyCount = schema.properties
          ? Object.keys(schema.properties).length
          : 0;

        return (
          <article
            key={schemaName}
            id={`schema-${schemaName}`}
            className={`rounded-xl border bg-surface p-5 shadow-sm transition-colors ${
              selectedKey === schemaName ? "border-primary-300 ring-1 ring-primary-200" : "border-border"
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
                focusTokens={schemaName === selectedKey ? focusTarget?.tokens ?? null : null}
                focusId={schemaName === selectedKey ? focusTarget?.id ?? null : null}
              />
            )}
          </article>
        );
      })}
    </div>
  ) : (
    <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-surface p-8 text-center text-sm text-foreground-muted">
      No schemas defined in this AsyncAPI document.
    </div>
  );

  return (
    <div className="flex justify-center w-full">
      <Section content={content} stickySideContent={false} />
    </div>
  );
}
