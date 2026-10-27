import MethodBadge from "../../components/MethodBadge";
import IconArrowRight from "../../icons/ArrowRight";
import type { OpenAPIDocumentData } from "../../types/openapi";
import { useStepOperationPanel, type LinkedOperation } from "./StepOperationPanel";

interface StepOperationProps {
  target: LinkedOperation;
  /** The OpenAPI document of `target.sourceName`. */
  source: OpenAPIDocumentData;
  /** Unique per step on the page; the operation's own DOM ids are derived from it. */
  anchorId: string;
}

/**
 * The OpenAPI operation a step calls, as a one-line header (method, path,
 * source) so a long workflow can be scanned. Clicking it opens the operation
 * in the side panel, exactly as the OpenAPI page shows an endpoint (see
 * StepOperationPanel).
 */
export default function StepOperation({ target, source, anchorId }: StepOperationProps) {
  const panel = useStepOperationPanel();
  const isOpen = panel?.openAnchorId === anchorId;
  const { operation, method, path } = target;

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={`${method.toUpperCase()} ${path}${operation.summary ? `, ${operation.summary}` : ""}, from ${target.sourceName}`}
      onClick={() => panel?.open({ target, source, anchorId })}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-neutral-100 ${
        isOpen ? "border-primary-300 bg-neutral-100" : "border-border bg-neutral-50"
      }`}
    >
      <MethodBadge method={method} size="xs" className="shrink-0" />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={path}>
        {target.isWebhook ? `webhook ${path}` : path}
      </span>
      <span className="hidden @md:inline shrink-0 truncate max-w-[12rem] text-xs text-foreground-muted" title={operation.operationId}>
        {operation.summary ?? operation.operationId}
      </span>
      <span
        className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-foreground-secondary"
        title={`From source "${target.sourceName}"`}
      >
        {target.sourceName}
      </span>
      <IconArrowRight className="w-3 h-3 shrink-0 text-foreground-muted" />
    </button>
  );
}
