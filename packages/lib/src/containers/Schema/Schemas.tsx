import { useMemo } from "react";
import Section, { type SectionLayout } from "../../components/Section";
import { SchemaNodeData } from "../../types/schema";
import { resolveSchemaInput, ResolvedSchemaInput } from "../../helpers/schemaFormat";
import { useProtobufConverterReady } from "../../helpers/protobuf/lazyProtoToJsonSchema";
import SchemaCard from "./SchemaCard";
import { useAsyncAPIDocument } from "../../contexts";

interface SchemasProps {
  schemas: Record<string, SchemaNodeData>;
  selectedKey?: string | null;
  /** The precisely-matched nested node search navigated to, if any — see Layout.tsx. */
  focusTarget?: { tokens: string[]; id: string } | null;
  layout?: SectionLayout;
}

export default function Schemas({ schemas, selectedKey, focusTarget, layout }: SchemasProps) {
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
      {schemaEntries.map(([schemaName, resolved]) => (
        <SchemaCard
          key={schemaName}
          schemaName={schemaName}
          resolved={resolved}
          anchorId={`schema-${schemaName}`}
          selected={selectedKey === schemaName}
          focusTarget={focusTarget}
        />
      ))}
    </div>
  ) : (
    <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-surface p-8 text-center text-sm text-foreground-muted">
      No schemas defined in this document.
    </div>
  );

  return (
    <div className="flex justify-center w-full">
      <Section content={content} stickySideContent={false} layout={layout} />
    </div>
  );
}
