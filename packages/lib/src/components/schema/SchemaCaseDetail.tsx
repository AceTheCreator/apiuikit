import { SchemaNodeData } from "../../types/schema";
import SchemaConstraints from "./SchemaConstraints";
import { hasConstraints } from "./schemaUtils";
import SchemaTypeLabel from "./SchemaTypeLabel";

const CONTENT_INDENT = "ml-6";

/** Compact details for a leaf oneOf branch — avoids duplicating the property path row. */
export default function SchemaCaseDetail({
  schema,
  showBorder = true,
}: {
  schema: SchemaNodeData;
  showBorder?: boolean;
}) {
  const description =
    typeof schema.description === "string" ? schema.description : undefined;

  return (
    <div
      className={`py-2 ${showBorder ? "border-b border-border last:border-b-0" : ""}`}
    >
      <div className="flex items-center gap-2 min-h-[24px]">
        <span className="w-4 shrink-0" aria-hidden="true" />
        <SchemaTypeLabel schema={schema} />
      </div>
      {hasConstraints(schema) && (
        <SchemaConstraints
          schema={schema}
          className={`flex flex-col gap-1 mt-1 ${CONTENT_INDENT}`}
        />
      )}
      {description &&
        description.split("\n\n").map((paragraph, index) => (
          <p
            key={index}
            className={`text-xs text-foreground-muted mt-1 ${CONTENT_INDENT} leading-relaxed`}
          >
            {paragraph}
          </p>
        ))}
    </div>
  );
}
