import { SchemaNodeData } from "../../types/schema";
import { buildTypeDisplay } from "./schemaDisplayUtils";

export interface SchemaTypeLabelProps {
  schema: SchemaNodeData;
  refLabel?: string;
  className?: string;
}

/** Renders the structural type string for a schema node. */
export default function SchemaTypeLabel({
  schema,
  refLabel,
  className = "text-xs text-foreground-muted",
}: SchemaTypeLabelProps) {
  const { text, format, refHint } = buildTypeDisplay(schema, refLabel);

  return (
    <span className={className}>
      {format ?? text}
      {refHint && !text.includes(`(${refHint})`) && (
        <span className="text-foreground-muted"> ({refHint})</span>
      )}
    </span>
  );
}
