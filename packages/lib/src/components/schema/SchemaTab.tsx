import { useEffect, useState } from "react";
import { SchemaViewer } from "../../containers/Schema/SchemaViewer";
import SchemaTree from "./SchemaTree";
import TabToggle from "../TabToggle";
import { Examples } from "../Examples";
import {
  schemaFormatBadge,
  schemaFormatName,
  supportsGeneratedExamples,
} from "../../helpers/schemaFormat";

function SchemaTabs({
  schema,
  label,
  rootName,
  description,
  schemaFormat,
  originalSchema,
  conversionError,
  pendingConversion,
}: {
  /** JSON Schema to render in the Schema/Example tabs. */
  schema: unknown;
  /** Heading shown above the tab toggle, e.g. "Payload" or "Headers". */
  label: string;
  /**
   * Path prefix for schema tree rows. Defaults to `label`. Use when the heading
   * should include extra context (e.g. media type) that must not appear in paths.
   */
  rootName?: string;
  description?: string;
  /** Declared multi-format wrapper (e.g. Avro, Protobuf) this schema was converted from, if any. */
  schemaFormat?: string;
  /** The pre-conversion schema, shown in the JSON tab instead of the converted `schema`. */
  originalSchema?: unknown;
  /** When set, conversion from `schemaFormat` failed: shown as a warning and hides the Example tab. */
  conversionError?: string;
  /** True while a Protobuf converter is still loading, see lazyProtoToJsonSchema.ts. */
  pendingConversion?: boolean;
}) {
  const formatBadge = schemaFormatBadge(schemaFormat);
  const showExample = !pendingConversion && supportsGeneratedExamples(schemaFormat, conversionError);
  const [tab, setTab] = useState<"schema" | "json" | "example">(showExample ? "example" : "schema");

  // If the Example tab disappears (conversion failed / non-JSON-Schema format)
  // while it was selected, fall back so the panel is not blank.
  useEffect(() => {
    if (!showExample && tab === "example") {
      setTab("schema");
    }
  }, [showExample, tab]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              {label}
            </p>
            {formatBadge && (
              <span
                className="text-xs font-mono bg-neutral-100 text-foreground-muted px-1.5 py-0.5 rounded"
                title={schemaFormat}
              >
                {formatBadge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-foreground-secondary leading-relaxed mt-2 mb-2">
              {description}
            </p>
          )}
        </div>
        <TabToggle
          tabs={[
            ...(showExample ? [{ id: "example", label: "Example" }] : []),
            { id: "schema", label: "Schema" },
            { id: "json", label: "JSON" },
          ]}
          selected={tab}
          onChange={(id) => setTab(id as "schema" | "json" | "example")}
          ariaLabel="Schema view toggle"
        />
      </div>
      {conversionError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
          Could not convert {schemaFormatName(schemaFormat) ?? "the"} schema,
          showing raw definition. {conversionError}
        </p>
      )}
      {pendingConversion ? (
        <p className="text-xs text-foreground-muted">Loading Protobuf definition…</p>
      ) : (
        <>
          {tab === "schema" && <SchemaTree schema={schema} rootName={rootName ?? label} />}
          {tab === "json" && (
            <SchemaViewer schema={originalSchema ?? schema} />
          )}
          {tab === "example" && showExample && (
            <Examples schema={schema as Record<string, unknown>} />
          )}
        </>
      )}
    </div>
  );
}

export default SchemaTabs;
