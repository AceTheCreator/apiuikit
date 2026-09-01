import { useId, useState } from "react";
import { OperationBindingsObject } from "../../types/asyncapi/OperationBindingsObject";
import Authorization from "../../components/Authorization";
import Bindings from "../../components/Bindings";
import CollapsiblePanel from "../../components/CollapsiblePanel";
import IconExternalLink from "../../icons/ExternalLink";
import { ExternalDocs } from "../../types/asyncapi/ExternalDocs";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { Operation as OperationInterface } from "../../types/asyncapi/Operation";
import { OperationAction } from "../../types/asyncapi/OperationAction";
import { OperationReply } from "../../types/asyncapi/OperationReply";
import { Tag } from "../../types/asyncapi/Tag";
import { Message } from "../Messages/Message";
import { Reply } from "../../components/Reply";
import Markdown from "../../components/Markdown";
import { AsyncCodeSample } from "../../components/AsyncCodeSample";
import { PluginBoundary, PluginSlot, useOperationTabPlugins } from "../../plugins/PluginSlot";
import Tabs from "../../components/Tabs";
import { useDocumentContext } from "../../contexts";
import type { AsyncAPIDocumentData } from "../../types/schema";

/** The built-in tab, always first — see PathOperation's identical constant. */
const REFERENCE_TAB_ID = "reference";

interface OperationProps {
  op: OperationInterface;
  id: string | null;
  /** Which collapsed section search navigated to, e.g. `binding:kafka`. */
  focusSection?: string | null;
}

export default function Operation({ op, id, focusSection = null }: OperationProps) {
  // Plugins get the whole document rather than pre-extracted fields — see
  // AsyncAPIOperationPluginContext. Operation only ever renders under
  // AsyncAPIDocumentProvider, so the cast mirrors the same narrowing
  // public/sections.tsx's useDocument() does.
  const documentContext = useDocumentContext();
  const document =
    documentContext.specType === "asyncapi"
      ? documentContext.document
      : (documentContext.document as unknown as AsyncAPIDocumentData);

  const authHeadingId = useId();
  const messages = (op.messages ?? []) as unknown as MessageObject[];
  const tags = (op.tags ?? []) as unknown as Tag[];
  const bindings = op.bindings as unknown as OperationBindingsObject | undefined;
  const traits = op.traits as unknown as Array<Record<string, unknown>> | undefined;
  const reply = op.reply as unknown as OperationReply | undefined;
  const externalDocs = op.externalDocs as unknown as ExternalDocs | undefined;
  const security = op.security as unknown as unknown[] | undefined;

  const operationBindings: OperationBindingsObject | undefined =
    bindings ??
    (Array.isArray(traits)
      ? (traits.find((t) => t.bindings)?.bindings as OperationBindingsObject | undefined)
      : undefined);

  const isSend = op.action === OperationAction.SEND;
  const messageList = (
    <div className="flex flex-col gap-2">
      {messages.map((msg, i) => (
        <Message key={i} message={msg} messageId={msg.name} i={i} />
      ))}
    </div>
  );

  const tabPlugins = useOperationTabPlugins("asyncapi.operation.tab");
  const [activeTabId, setActiveTabId] = useState<string>(REFERENCE_TAB_ID);
  const showTabs = !!id && tabPlugins.length > 0;
  const activePlugin = showTabs ? tabPlugins.find((entry) => entry.id === activeTabId) : undefined;
  const ActivePluginComponent = activePlugin?.Component;

  return (
    <div className="flex flex-col gap-6" id={`operation-${id}-detail`}>
      {showTabs && (
        <Tabs
          variant="segmented"
          ariaLabel="Operation view"
          tabs={[
            { id: REFERENCE_TAB_ID, name: "Reference" },
            ...tabPlugins.map((entry) => ({ id: entry.id, name: entry.label })),
          ]}
          current={activePlugin ? activePlugin.id : REFERENCE_TAB_ID}
          onChange={setActiveTabId}
        />
      )}

      {activePlugin && ActivePluginComponent && id ? (
        <PluginBoundary label={`asyncapi.operation.tab:${activePlugin.id}`}>
          <ActivePluginComponent document={document} operationId={id} />
        </PluginBoundary>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-primary-50 text-primary-600 border border-primary-200`}
            >
              ID: {id}
            </span>
            {externalDocs?.url && (
              <a
                href={externalDocs.url}
                target="_blank"
                rel="noreferrer"
                title={externalDocs.description || externalDocs.url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-foreground-secondary border border-border hover:bg-neutral-200 transition-colors"
              >
                External Documentation
                <IconExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
            {op.description && (
              <div>
                <Markdown>{op.description}</Markdown>
              </div>
            )}
          {op.summary && (
            <div>
              <p className="text-sm text-foreground-secondary">{op.summary}</p>
            </div>
          )}

          <AsyncCodeSample operationId={id} />

          {id && <PluginSlot name="asyncapi.operation.reference.supplementary" context={{ document, operationId: id }} />}

          {/* Security */}
          {security && security.length > 0 && (
            <div id={`operation-${id}-security`}>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
                Operation Authorization
              </p>
              <CollapsiblePanel
                ariaLabelledBy={authHeadingId}
                forceExpanded={focusSection === "security"}
                trigger={
                  <span className="text-xs font-normal text-foreground-muted bg-neutral-100 border border-border rounded-full px-2 py-0.5">
                    {security.length}
                  </span>
                }
              >
                <div className="px-4 py-2 border-t border-border">
                  <Authorization
                    securities={
                      security as Parameters<
                        typeof Authorization
                      >[0]["securities"]
                    }
                  />
                </div>
              </CollapsiblePanel>
            </div>
          )}

          {/* Bindings */}
          {operationBindings &&
            Object.entries(operationBindings).map(([protocol, binding]) =>
              binding ? (
                <div key={protocol} id={`operation-${id}-bindings-${protocol}`}>
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1">
                    Operation configuration
                  </p>
                  <Bindings
                    protocol={protocol}
                    bindings={binding as Record<string, unknown>}
                    focused={focusSection === `binding:${protocol}`}
                  />
                </div>
              ) : null,
            )}

          {/* Messages */}
          {reply ? (
            <Reply
              requestMessages={messages}
              reply={reply}
              isSend={isSend}
              operationId={id}
            />
          ) : (
            messages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
                  <span className="font-bold">{id}</span>{" "}
                  {isSend ? "accepts" : "expects"}
                  {messages.length > 1 ? (
                    <>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold text-foreground-mute">
                        one of
                      </span>
                      the following messages:
                    </>
                  ) : (
                    " the following message:"
                  )}
                </p>
                {messageList}
              </div>
            )
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-foreground-secondary"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
