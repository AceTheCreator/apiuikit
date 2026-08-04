import { SchemaNodeData } from "../../types/schema";
import SchemaConstraints from "./SchemaConstraints";
import { hasConstraints } from "./schemaUtils";
import SchemaTypeLabel from "./SchemaTypeLabel";
import { shouldShowRefFootnote } from "./schemaDisplayUtils";

const CONTENT_INDENT = "ml-6";

export interface SchemaFieldMetaProps {
  schema: SchemaNodeData;
  refLabel?: string;
  itemSchema?: SchemaNodeData | null;
  typeLabelOverride?: string;
  fieldName?: string;
  className?: string;
}

/** Stacked layout: type on first line, constraint badges below (left-aligned). */
export default function SchemaFieldMeta({
  schema,
  refLabel,
  itemSchema,
  typeLabelOverride,
  fieldName,
  className = "",
}: SchemaFieldMetaProps) {
  const showRef = !typeLabelOverride && shouldShowRefFootnote(schema, refLabel);

  return (
    <div className={className}>
      {typeLabelOverride ? (
        <span className="text-xs text-foreground-muted">{typeLabelOverride}</span>
      ) : (
        <div>
          <SchemaTypeLabel schema={schema} refLabel={refLabel} />
          {showRef && (
            <span className="text-xs text-foreground-muted"> (ref: {refLabel})</span>
          )}
        </div>
      )}
      {hasConstraints(schema, itemSchema) && (
        <SchemaConstraints
          schema={schema}
          itemSchema={itemSchema}
          fieldName={fieldName}
          className={`flex flex-col gap-1 mt-1 ${CONTENT_INDENT}`}
        />
      )}
    </div>
  );
}
