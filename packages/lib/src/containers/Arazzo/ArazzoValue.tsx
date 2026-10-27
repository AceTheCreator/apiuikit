import CodeBlock from "../../components/CodeBlock";
import { CopyButton } from "../../components/CopyButton";
import { sourceAnchor, stepKey } from "../../helpers/arazzoAnchors";
import { valueExpressions } from "../../helpers/arazzoDataFlow";
import type {
  ArazzoAction,
  ArazzoCriterion,
  ArazzoExpression,
  ArazzoExpressionTarget,
  ArazzoValue,
  ArazzoWorkflowLink,
} from "../../types/arazzo";
import { ArazzoLink } from "./ArazzoLinks";
import { useArazzoLinks } from "./arazzoLinksContext";
import { useDataFlowHighlight, useIsHighlighted } from "./dataFlowHighlight";

/*
 * Values, criteria and actions as text. Runtime expressions keep their
 * original spelling, as chips tinted by what they read, so the reader sees
 * exactly what the document says and can follow each value to where it's
 * produced.
 */

// Tints rather than solid colors, with the text in the foreground color, so
// chips stay legible on light and dark themes alike.
const CHIP_TINT: Partial<Record<ArazzoExpressionTarget["kind"], string>> = {
  input: "bg-primary-500/10 ring-primary-500/30",
  "step-output": "bg-secondary-500/10 ring-secondary-500/30",
  "workflow-output": "bg-secondary-500/10 ring-secondary-500/30",
  step: "bg-secondary-500/10 ring-secondary-500/30",
  source: "bg-neutral-100 ring-neutral-300",
  component: "bg-neutral-100 ring-neutral-300",
};
const EXCHANGE_TINT = "bg-neutral-100 ring-transparent";
const PROBLEM_TINT = "bg-red-500/10 ring-red-500/40 text-red-600 underline decoration-dotted decoration-red-500";

const scrollToSource = (name: string) => {
  document.getElementById(sourceAnchor(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/**
 * One runtime expression, as written, as a chip. Its tooltip says what it
 * reads; one that is invalid or points at nothing is marked, with why.
 * Expressions reading a value produced in this document are buttons: they go
 * to where the value is defined, and pointing at one highlights the step that
 * produces it and every step that uses it.
 */
export function ExpressionText({ expression }: { expression: ArazzoExpression }) {
  const { goTo } = useArazzoLinks();
  const highlight = useDataFlowHighlight();
  const target = expression.target;
  const valueKey = target?.valueKey;
  const highlighted = useIsHighlighted(valueKey);

  const problem = expression.node === null ? "Not a valid runtime expression" : target?.problem;
  const title = [target?.description, problem].filter(Boolean).join(". ") || undefined;
  const tint = problem ? PROBLEM_TINT : (target && CHIP_TINT[target.kind]) ?? EXCHANGE_TINT;
  const className = `rounded px-1 py-0.5 font-mono text-xs break-all ring-1 ring-inset ${problem ? "" : "text-foreground"} ${
    highlighted ? "bg-primary-500/20 ring-2 ring-primary-500" : tint
  }`;

  const navigate = target?.linkKey
    ? () => goTo(target.linkKey!)
    : target?.sourceName
      ? () => scrollToSource(target.sourceName!)
      : undefined;
  if (!navigate && !valueKey) {
    return (
      <code className={className} title={title} data-expression-kind={target?.kind ?? "invalid"}>
        {expression.text}
      </code>
    );
  }

  const point = () => valueKey && highlight?.set(valueKey);
  const leave = () => highlight?.get() === valueKey && highlight?.set(null);
  return (
    <button
      type="button"
      onClick={navigate}
      onMouseEnter={point}
      onMouseLeave={leave}
      onFocus={point}
      onBlur={leave}
      title={title}
      data-expression-kind={target?.kind}
      className={`${className} inline cursor-pointer select-text text-left hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
    >
      {expression.text}
    </button>
  );
}

/** `text` cut around each expression, found in order. One that can't be found (escaped in JSON, say) stays as text. */
function splitAround(text: string, expressions: ArazzoExpression[]): Array<string | ArazzoExpression> {
  const parts: Array<string | ArazzoExpression> = [];
  let from = 0;
  for (const expression of expressions) {
    const at = text.indexOf(expression.text, from);
    if (at === -1) continue;
    if (at > from) parts.push(text.slice(from, at));
    parts.push(expression);
    from = at + expression.text.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

/** Text with chips in place of the expressions it embeds. */
function TextWithExpressions({ parts }: { parts: Array<string | ArazzoExpression> }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? <span key={index}>{part}</span> : <ExpressionText key={index} expression={part} />,
      )}
    </>
  );
}

const formatLiteral = (raw: unknown) => (typeof raw === "string" ? raw : JSON.stringify(raw));

/** A value inline: a literal, an expression, or text with expressions embedded. */
export function ValueText({ value }: { value: ArazzoValue }) {
  switch (value.kind) {
    case "expression":
      return <ExpressionText expression={value.expression} />;
    case "template":
      return (
        <span className="font-mono text-xs break-all text-foreground-secondary">
          <TextWithExpressions parts={value.parts} />
        </span>
      );
    default:
      return <span className="font-mono text-xs break-all text-foreground-secondary">{formatLiteral(value.raw)}</span>;
  }
}

/**
 * A request payload as a block: objects pretty-printed, text as written. A
 * payload embedding expressions shows them as chips, in place; one without is
 * syntax-highlighted.
 */
export function PayloadBlock({ value, contentType }: { value: ArazzoValue; contentType?: string }) {
  if (value.kind === "expression") return <ExpressionText expression={value.expression} />;
  const code = (typeof value.raw === "string" ? value.raw : JSON.stringify(value.raw, null, 2)).trimEnd();
  const expressions = valueExpressions(value);
  if (expressions.length === 0) {
    const language = contentType?.includes("json") || typeof value.raw !== "string" ? "json" : contentType?.includes("xml") ? "xml" : undefined;
    return <CodeBlock code={code} language={language} />;
  }
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-border bg-neutral-50 py-3 pl-3 pr-10 font-mono text-xs leading-6 text-foreground-secondary">
        <TextWithExpressions parts={splitAround(code, expressions)} />
      </pre>
      <CopyButton text={code} ariaLabel="Copy request body" />
    </div>
  );
}

const criterionTypeLabel = (criterion: ArazzoCriterion) =>
  criterion.version ? `${criterion.type} (${criterion.version})` : criterion.type;

/** A success criterion: a simple condition as written, or a regex/JSONPath/XPath applied to its context. */
export function CriterionText({ criterion }: { criterion: ArazzoCriterion }) {
  if (criterion.type === "simple") {
    return (
      <code
        className={`font-mono text-xs leading-6 break-all ${criterion.conditionNode === null ? "text-red-600" : "text-foreground"}`}
        title={criterion.conditionNode === null ? "Not a valid condition" : undefined}
      >
        <TextWithExpressions parts={splitAround(criterion.condition, criterion.expressions)} />
      </code>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {criterion.context && <ValueText value={criterion.context} />}
      <span className="text-foreground-muted">matches {criterionTypeLabel(criterion)}</span>
      <code className="font-mono break-all text-foreground">{criterion.condition}</code>
    </span>
  );
}

export function CriteriaList({ criteria, label }: { criteria: ArazzoCriterion[]; label?: string }) {
  if (criteria.length === 0) return null;
  return (
    <div>
      {label && <p className="mb-1 text-xs text-foreground-muted">{label}</p>}
      <ul className="space-y-1">
        {criteria.map((criterion, index) => (
          <li key={index} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-xs text-foreground-muted">
              {index === 0 ? "•" : "and"}
            </span>
            <CriterionText criterion={criterion} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const ACTION_BADGE: Record<string, string> = {
  end: "bg-neutral-200 text-foreground-secondary",
  goto: "bg-primary-50 text-primary-700",
  retry: "bg-amber-100 text-amber-800",
};

/** A workflow reference: a link when it's in this document, the source name when it's elsewhere. */
export function WorkflowRef({ link }: { link: ArazzoWorkflowLink }) {
  if (link.status === "linked" && !link.sourceName) return <ArazzoLink to={link.workflowId}>{link.workflowId}</ArazzoLink>;
  if (link.status === "linked") {
    return (
      <span className="font-mono text-xs">
        {link.workflowId} <span className="text-foreground-muted">in {link.sourceName}</span>
      </span>
    );
  }
  return (
    <span className="font-mono text-xs text-foreground-secondary" title={link.message}>
      {link.ref} <UnavailableBadge reason={link.message} />
    </span>
  );
}

export function UnavailableBadge({ reason, label = "Unavailable" }: { reason?: string; label?: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800"
      title={reason}
    >
      {label}
    </span>
  );
}

/** What an action does next, in words: "Go to step X", "Retry after 5s, up to 3 times", "End the workflow". */
function ActionEffect({ action, workflowId }: { action: ArazzoAction; workflowId: string }) {
  const target = action.stepId !== undefined ? (
    action.stepFound ? (
      <ArazzoLink to={stepKey(workflowId, action.stepId)}>{action.stepId}</ArazzoLink>
    ) : (
      <span className="font-mono text-xs">
        {action.stepId} <UnavailableBadge label="Not found" reason={`There is no step "${action.stepId}" in this workflow.`} />
      </span>
    )
  ) : action.workflow ? (
    <WorkflowRef link={action.workflow} />
  ) : null;

  if (action.type === "goto") {
    return <span className="text-xs text-foreground-secondary">Go to {action.stepId !== undefined ? "step" : "workflow"} {target}</span>;
  }
  if (action.type === "retry") {
    const timing = [
      action.retryAfter !== undefined ? `after ${action.retryAfter}s` : null,
      action.retryLimit !== undefined ? `up to ${action.retryLimit} ${action.retryLimit === 1 ? "time" : "times"}` : null,
    ].filter(Boolean);
    return (
      <span className="text-xs text-foreground-secondary">
        Retry{timing.length ? ` ${timing.join(", ")}` : ""}
        {target && <> from {action.stepId !== undefined ? "step" : "workflow"} {target}</>}
      </span>
    );
  }
  if (action.type === "end") return <span className="text-xs text-foreground-secondary">End the workflow</span>;
  return <span className="text-xs text-foreground-secondary">{action.type || "Unknown action"}</span>;
}

export function ActionList({ actions, label, workflowId }: { actions: ArazzoAction[]; label: string; workflowId: string }) {
  if (actions.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-foreground-muted">{label}</p>
      <ul className="space-y-2">
        {actions.map((action, index) => (
          <li key={index} className="rounded-md border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${ACTION_BADGE[action.type] ?? ACTION_BADGE.end}`}>
                {action.type || "?"}
              </span>
              {action.name && <span className="font-mono text-xs text-foreground">{action.name}</span>}
              <ActionEffect action={action} workflowId={workflowId} />
              {action.component && (
                <span className="text-[10px] text-foreground-muted" title={action.component.reference}>
                  from components
                </span>
              )}
            </div>
            {action.criteria.length > 0 && (
              <div className="mt-1.5">
                <CriteriaList criteria={action.criteria} label="When" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
