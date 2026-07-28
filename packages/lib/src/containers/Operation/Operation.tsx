import { OperationBindingsObject } from "../../types/asyncapi/OperationBindingsObject";
import Authorization from "../../components/Authorization";
import Bindings from "../../components/Bindings";
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

interface OperationProps {
  op: OperationInterface;
  id: string | null;
  /** Which collapsed section search navigated to, e.g. `binding:kafka`. */
  focusSection?: string | null;
}

export default function Operation({ op, id, focusSection = null }: OperationProps) {
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
    <div className="space-y-2">
      {messages.map((msg, i) => (
        <Message key={i} message={msg} messageId={msg.name} i={i} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6" id={`operation-${id}-detail`}>
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

      {/* Security */}
      {security && security.length > 0 && (
        <div id={`operation-${id}-security`}>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
            Operation Authorization
          </p>
          <Authorization
            securities={
              security as Parameters<typeof Authorization>[0]["securities"]
            }
          />
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
    </div>
  );
}
