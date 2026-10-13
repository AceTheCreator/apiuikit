import { useState } from "react";
import Section, { type SectionLayout } from "../../components/Section";
import { MessageDetails } from "./MessageDetails";
import { MessageObject } from "../../types/asyncapi/MessageObject";
import { CorrelationId } from "../../types/asyncapi/CorrelationId";

interface MessageCardProps {
  messageKey: string;
  message: MessageObject;
  layout?: SectionLayout;
}

/**
 * One `components.messages` entry rendered on its own: the same name, key,
 * summary and badges a row of the Messages table shows, with its details
 * (description, payload/headers, tags) open from the start — a lone message
 * has no list to keep compact.
 */
export default function MessageCard({ messageKey, message, layout }: MessageCardProps) {
  const [expanded, setExpanded] = useState(true);
  const correlationId = message.correlationId as CorrelationId | undefined;

  const content = (
    <article className="bg-surface rounded-lg border border-border overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {message.title ?? message.name ?? messageKey}
          </span>
          <span className="w-fit text-xs font-mono bg-primary-50 text-primary-600 border border-primary-200 px-1.5 py-0.5 rounded">
            {messageKey}
          </span>
          {message.summary && <span className="text-sm text-foreground-muted">{message.summary}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {message.contentType && (
            <span className="text-xs font-mono bg-neutral-100 text-foreground-muted px-1.5 py-0.5 rounded">
              {message.contentType}
            </span>
          )}
          {message.deprecated && (
            <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-200">
              deprecated
            </span>
          )}
          {correlationId && (
            <span
              className="text-xs bg-secondary-50 text-secondary-500 px-1.5 py-0.5 rounded border border-secondary-200"
              title={correlationId.description ?? correlationId.location}
            >
              {correlationId.location}
            </span>
          )}
        </div>
      </header>
      <MessageDetails
        message={message}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
        paddingX="px-6"
      />
    </article>
  );

  return (
    <div className="flex justify-center w-full">
      <Section content={content} stickySideContent={false} layout={layout} />
    </div>
  );
}
