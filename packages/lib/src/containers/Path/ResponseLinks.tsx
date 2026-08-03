import { Fragment } from "react";
import IconInfo from "../../icons/Info";
import { OpenAPILinkData } from "../../types/openapi";

/**
 * A response's `links`: which operation you can call next using values from
 * this response. Rendered as a small annotated note rather than a tab or
 * table, since a link is a design-time relationship worth pointing at, not a
 * view of the response itself.
 *
 * The link's own `description` is the clickable part, so the sentence reads as
 * documentation ("Fetch the newly created user using ...") rather than naming
 * an operationId the reader has no other use for. It falls back to the target
 * itself when a link declares no description.
 */

interface ResponseLinksProps {
  links: Record<string, OpenAPILinkData>;
  /** Opens the operation with this `operationId`. Omitted when nothing can navigate. */
  onFollowOperation?: (operationId: string) => void;
  /** Whether `operationId` resolves to an operation in the current list, so the target can be a link rather than plain text. */
  isOperationKnown?: (operationId: string) => boolean;
}

/** The spec allows either form and treats them as mutually exclusive. */
function linkTarget(link: OpenAPILinkData): string | null {
  return link.operationId ?? link.operationRef ?? null;
}

/** Trailing punctuation would collide with the rest of the sentence. */
const asLeadIn = (description: string) => description.trim().replace(/[.:;]+$/, "");

/**
 * Runtime expressions are specified as `$response.body#/id`, where `#/...` is
 * a JSON Pointer into the body. Read as a plain path (`response.body.id`)
 * that's far easier to follow in prose. Literal values are left alone.
 */
function readableExpression(value: unknown): string {
  if (typeof value !== "string") return JSON.stringify(value);
  if (!value.startsWith("$")) return value;
  return value.slice(1).replace(/#\//g, ".").replace(/\//g, ".");
}

const Code = ({ children }: { children: string }) => (
  <code className="font-mono text-foreground-secondary">{children}</code>
);

export default function ResponseLinks({
  links,
  onFollowOperation,
  isOperationKnown,
}: ResponseLinksProps) {
  return (
    <div className="mt-3 space-y-1">
      {Object.entries(links).map(([name, link]) => {
        const target = linkTarget(link);
        const parameters = Object.entries(link.parameters ?? {});
        const description = link.description ? asLeadIn(link.description) : null;
        // Only an operationId can be resolved to something to open; an
        // operationRef is a document pointer, so it stays plain text.
        const canFollow = !!link.operationId && !!onFollowOperation && !!isOperationKnown?.(link.operationId);
        const label = description ?? target ?? name;

        return (
          <p key={name} className="flex items-start gap-1.5 text-xs text-foreground-muted leading-relaxed">
            <IconInfo className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {/* A button, not an anchor: this opens a panel in place rather
                  than navigating to a URL, so there is no href worth having. */}
              {canFollow ? (
                <button
                  type="button"
                  onClick={() => onFollowOperation!(link.operationId!)}
                  className="text-primary-600 underline underline-offset-2 hover:text-primary-500"
                >
                  {label}
                </button>
              ) : (
                <span className="text-foreground-secondary">{label}</span>
              )}
              {parameters.length > 0 && (
                <>
                  {" using "}
                  {parameters.map(([paramName, value], index) => (
                    <Fragment key={paramName}>
                      {index > 0 && (index === parameters.length - 1 ? " and " : ", ")}
                      <Code>{paramName}</Code>
                      {" from "}
                      <Code>{readableExpression(value)}</Code>
                    </Fragment>
                  ))}
                </>
              )}
              {link.server?.url ? <> via <Code>{link.server.url}</Code></> : null}.
            </span>
          </p>
        );
      })}
    </div>
  );
}
