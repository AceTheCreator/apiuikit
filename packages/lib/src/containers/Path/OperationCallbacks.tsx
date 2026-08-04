import type { ComponentType } from "react";
import CollapsiblePanel from "../../components/CollapsiblePanel";
import MethodBadge from "../../components/MethodBadge";
import { readableCallbackUrl } from "../../helpers/runtimeExpression";
import { HTTP_METHODS, HttpMethod, OpenAPICallbackData } from "../../types/openapi";

/**
 * An operation's `callbacks`: requests the API sends back out to the caller
 * after this operation runs. Each callback's leaf is an ordinary Operation
 * Object, so it renders through PathOperation itself rather than a lesser
 * parallel rendering that would drift from it.
 *
 * The direction is inverted from everything else in the panel, though. Here
 * the API is the sender and the reader is the server, so the set is framed
 * with who calls what before the reused operation view (whose own wording
 * assumes the reader is the caller) appears.
 *
 * The spec nests these two deep (callback name, then URL expression, then
 * method), but that hierarchy isn't worth making a reader navigate: it's
 * flattened to one card per operation, each titled with all three parts, so
 * every request body has its own labelled home.
 */

/** Injected to avoid an import cycle: PathOperation renders this file, and this file renders PathOperation back. */
type OperationRenderer = ComponentType<{
  method: HttpMethod;
  path: string;
  op: OpenAPICallbackData[string][HttpMethod] & object;
  id: string | null;
  idPrefix?: string;
  depth?: number;
}>;

interface OperationCallbacksProps {
  callbacks: Record<string, OpenAPICallbackData>;
  /** Parent operation's anchor id, used to keep nested anchors unique. */
  id: string | null;
  renderOperation: OperationRenderer;
  /** Nesting level of the parent operation, so a callback's own callbacks don't recurse without end. */
  depth: number;
}

interface FlatCallback {
  name: string;
  url: string;
  method: HttpMethod;
  op: OpenAPICallbackData[string][HttpMethod] & object;
  /** Position of this URL under its callback name, keeping anchors unique when one name has several destinations. */
  urlIndex: number;
}

function flattenCallbacks(callbacks: Record<string, OpenAPICallbackData>): FlatCallback[] {
  return Object.entries(callbacks).flatMap(([name, callback]) =>
    Object.entries(callback ?? {}).flatMap(([url, pathItem], urlIndex) =>
      HTTP_METHODS.filter((method) => pathItem?.[method]).map((method) => ({
        name,
        url,
        method,
        op: pathItem[method]!,
        urlIndex,
      })),
    ),
  );
}

export default function OperationCallbacks({
  callbacks,
  id,
  renderOperation: RenderOperation,
  depth,
}: OperationCallbacksProps) {
  const entries = flattenCallbacks(callbacks);
  if (entries.length === 0) return null;

  return (
    <div>
      {/* No "Callbacks" heading: the tab holding this already says so. The
          direction note stays, since that's the part a reader can't infer. */}
      <p className="text-xs text-foreground-muted mb-3">
        Requests the API sends to you after this operation, not ones you call.
      </p>

      <div className="space-y-2">
        {entries.map(({ name, url, method, op, urlIndex }) => (
          <CollapsiblePanel
            key={`${name}-${urlIndex}-${method}`}
            trigger={
              <span className="flex items-center gap-2 text-xs font-normal min-w-0">
                <MethodBadge method={method} size="xs" className="shrink-0" />
                <span className="font-medium text-foreground-secondary shrink-0">{name}</span>
                <code className="font-mono text-foreground-muted truncate">
                  {readableCallbackUrl(url)}
                </code>
              </span>
            }
          >
            <div className="px-4 py-3 border-t border-border">
              <RenderOperation
                method={method}
                path={url}
                op={op}
                id={`${id}-${name}-${urlIndex}-${method}`}
                idPrefix="callback"
                depth={depth + 1}
              />
            </div>
          </CollapsiblePanel>
        ))}
      </div>
    </div>
  );
}
