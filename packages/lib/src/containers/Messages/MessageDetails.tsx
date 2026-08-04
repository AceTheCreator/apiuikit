import { useEffect, useMemo, useState } from "react";
import IconArrowDown from "../../icons/ArrowDown";
import TagComponent from "../../components/Tag";
import Tabs from "../../components/Tabs";
import SchemaTabs from "../../components/schema/SchemaTab";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { Tag } from "../../types/asyncapi/Tag";
import { resolveSchemaInput } from "../../helpers/schemaFormat";
import { useProtobufConverterReady } from "../../helpers/protobuf/lazyProtoToJsonSchema";
import { useAsyncAPIDocument } from "../../contexts";

interface MessageDetailsProps {
  message: MessageObject;
  expanded: boolean;
  onToggleExpanded: () => void;
  paddingX?: string;
  /** "payload" | "headers" when search navigated here for that schema specifically. */
  focusSection?: string | null;
}

export function MessageDetails({
  message,
  expanded,
  onToggleExpanded,
  paddingX = "px-4",
  focusSection = null,
}: MessageDetailsProps) {
  const [schemaTab, setSchemaTab] = useState<"payload" | "headers">("payload");
  useEffect(() => {
    if (focusSection === "headers" || focusSection === "payload") setSchemaTab(focusSection);
  }, [focusSection]);
  const { deref } = useAsyncAPIDocument();
  // Re-resolves once the (lazy-loaded) Protobuf converter becomes available —
  // see lazyProtoToJsonSchema.ts.
  const protobufReady = useProtobufConverterReady();

  const payload = useMemo(
    () => (message.payload ? resolveSchemaInput(message.payload, deref) : null),
    // protobufReady isn't read in the body, but resolveSchemaInput's result
    // silently depends on it via module-level state (lazyProtoToJsonSchema.ts)
    // — the memo must invalidate when it flips or a pending conversion never re-resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message.payload, deref, protobufReady],
  );
  const headers = useMemo(
    () => (message.headers ? resolveSchemaInput(message.headers, deref) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message.headers, deref, protobufReady],
  );

  // Prefer the message's own declared example over letting the Example tab
  // fake-generate one from the schema.
  const firstExample = (message.examples as Array<{ payload?: unknown; headers?: unknown }> | undefined)?.[0];

  const hasMore =
    message.description ||
    message.payload ||
    message.headers ||
    message.deprecated ||
    (message.tags && (message.tags as Tag[]).length > 0);

  return (
    <>
      <div
        className={`grid transition-all duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`${paddingX} pb-4 space-y-4 border-t border-border pt-3`}>
            {message.description && (
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {message.description}
              </p>
            )}
            {(message.payload || message.headers) && (
              <div>
                {message.payload && message.headers && (
                  <Tabs
                    tabs={[
                      { id: "payload", name: "Payload" },
                      { id: "headers", name: "Headers" },
                    ]}
                    current={schemaTab}
                    onChange={(id) => setSchemaTab(id as "payload" | "headers")}
                  />
                )}
                <div className="mt-4">
                  {(schemaTab === "payload" || !message.headers) && payload && (
                    <SchemaTabs
                      schema={payload.schema}
                      label="Payload"
                      description={payload.description}
                      schemaFormat={payload.schemaFormat}
                      originalSchema={payload.originalSchema}
                      conversionError={payload.conversionError}
                      pendingConversion={payload.pendingConversion}
                      example={firstExample?.payload}
                    />
                  )}
                  {(schemaTab === "headers" || !message.payload) && headers && (
                    <SchemaTabs
                      schema={headers.schema}
                      label="Headers"
                      description={headers.description}
                      schemaFormat={headers.schemaFormat}
                      originalSchema={headers.originalSchema}
                      conversionError={headers.conversionError}
                      pendingConversion={headers.pendingConversion}
                      example={firstExample?.headers}
                    />
                  )}
                </div>
              </div>
            )}
            {message.tags && (message.tags as Tag[]).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(message.tags as Tag[]).map((tag, i) => (
                  <TagComponent key={i} name={`#${tag.name}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasMore && (
        <button
          onClick={onToggleExpanded}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border bg-neutral-50 hover:bg-neutral-100 transition-colors text-xs text-foreground-muted hover:text-foreground-secondary"
        >
          <span>{expanded ? "Show less" : "Show more"}</span>
          <IconArrowDown
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </>
  );
}
