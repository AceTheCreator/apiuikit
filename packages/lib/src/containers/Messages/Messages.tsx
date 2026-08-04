import { useEffect, useState } from "react";
import Section from "../../components/Section";
import { MessageDetails } from "./MessageDetails";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { CorrelationId } from "../../types/asyncapi/CorrelationId";

interface MessagesProps {
  messages: Record<string, MessageObject>;
  selectedKey?: string | null;
  /** Which collapsed section ("payload" | "headers") search navigated to. */
  focusSection?: string | null;
}

function MessageRow({ messageKey, message, first, isSelected, focusSection }: { messageKey: string; message: MessageObject; first: boolean; isSelected?: boolean; focusSection?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);

  return (
    <tbody
      id={`message-${messageKey}`}
      className={`${first ? "" : "border-t border-border"} ${isSelected ? "bg-primary-50/60 outline outline-1 outline-primary-300" : ""}`}
    >
      <tr className="">
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {message.title ?? message.name ?? messageKey}
            </span>
            <span className="w-fit text-xs font-mono bg-primary-50 text-primary-600 border border-primary-200 px-1.5 py-0.5 rounded">
              {messageKey}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-foreground-muted">
          {message.summary ?? "—"}
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex justify-between w-full">
              <div></div>
              <div>
                {message.contentType && (
                  <span className="text-xs font-mono bg-neutral-100 text-foreground-muted px-1.5 py-0.5 rounded">
                    {message.contentType ?? "—"}
                  </span>
                )}
              </div>
            </div>
            {message.deprecated && (
              <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-200">
                deprecated
              </span>
            )}
            <div className="flex justify-between w-full">
              <div></div>
              <div>
                {message.correlationId && (
                  <span
                    className="text-xs bg-secondary-50 text-secondary-500 px-1.5 py-0.5 rounded border border-secondary-200"
                    title={
                      (message.correlationId as CorrelationId).description ??
                      (message.correlationId as CorrelationId).location
                    }
                  >
                    {(message.correlationId as CorrelationId).location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td colSpan={3} className="p-0">
          <MessageDetails
            message={message}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            paddingX="px-6"
            focusSection={isSelected ? focusSection : null}
          />
        </td>
      </tr>
    </tbody>
  );
}

export default function Messages({ messages, selectedKey, focusSection }: MessagesProps) {
  const messageEntries = Object.entries(messages);

  const content = messageEntries.length ? (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-100">
          <tr>
            <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Message
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Summary
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Details
            </th>
          </tr>
        </thead>
          {messageEntries.map(([messageKey, message], i) => (
            <MessageRow key={messageKey} messageKey={messageKey} message={message} first={i === 0} isSelected={selectedKey === messageKey} focusSection={focusSection} />
          ))}
      </table>
    </div>
  ) : (
    <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-surface p-8 text-center text-sm text-foreground-muted">
      No messages defined in this AsyncAPI document.
    </div>
  );

  return (
    <div className="flex justify-center w-full">
      <Section content={content} stickySideContent={false} />
    </div>
  );
}
