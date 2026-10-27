import { useId, useMemo, useState, type ReactNode } from "react";
import Markdown from "../../components/Markdown";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { SchemaTree } from "../../components/schema";
import IconArrowRight from "../../icons/ArrowRight";
import IconArrowDown from "../../icons/ArrowDown";
import { stepAnchor, stepKey, workflowAnchor, workflowKey } from "../../helpers/arazzoAnchors";
import { dataFlowKey, inputUses, stepSites } from "../../helpers/arazzoDataFlow";
import type { ArazzoModel, ArazzoOutput, ArazzoParameter, ArazzoStep, ArazzoValueUse, ArazzoWorkflow } from "../../types/arazzo";
import { ArazzoLink, ArazzoLinksProvider } from "./ArazzoLinks";
import { useArazzoLinks } from "./arazzoLinksContext";
import { DataFlowHighlight, DataFlowHighlightContext, useHighlightRole, useIsHighlighted } from "./dataFlowHighlight";
import { ActionList, CriteriaList, PayloadBlock, UnavailableBadge, ValueText, WorkflowRef } from "./ArazzoValue";
import StepOperation from "./StepOperation";

function Heading({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-foreground-muted">{children}</p>;
}

/** The steps that read a value, once each, as links: "Used by find-coupons, place-order". */
function UsedBy({ uses, workflowId }: { uses: ArazzoValueUse[] | undefined; workflowId: string }) {
  const readers = new Map<string, ReactNode>();
  for (const use of uses ?? []) {
    const key = use.stepId === undefined ? workflowKey(use.workflowId) : stepKey(use.workflowId, use.stepId);
    if (readers.has(key)) continue;
    const label = use.stepId === undefined ? `${use.workflowId === workflowId ? "workflow" : use.workflowId} outputs` : use.workflowId === workflowId ? use.stepId : `${use.workflowId} › ${use.stepId}`;
    readers.set(key, label);
  }
  if (readers.size === 0) return null;
  return (
    <span className="text-[11px] text-foreground-muted">
      Used by{" "}
      {[...readers].map(([key, label], index) => (
        <span key={key}>
          {index > 0 && ", "}
          <ArazzoLink to={key} className="text-[11px]">
            {label}
          </ArazzoLink>
        </span>
      ))}
    </span>
  );
}

/**
 * One output: its name, its value, and who reads it. While one of its readers'
 * chips is pointed at, it's tinted and a dashed border marches around it, so
 * the value's source stands out even a few steps up the page.
 */
function OutputRow({ output, valueKey, model, workflowId }: { output: ArazzoOutput; valueKey: string; model: ArazzoModel; workflowId: string }) {
  const highlighted = useIsHighlighted(valueKey);
  return (
    // A subgrid row rather than `contents`: name and value keep the list's
    // shared columns, and the row gets one box to tint and outline.
    // At rest the row has no side padding, so it lines up with the heading.
    // Highlighted, the box grows outward (padding plus an equal negative
    // margin) to make room inside the border, without moving the text.
    <div className={`relative col-span-2 grid grid-cols-subgrid rounded py-0.5 ${highlighted ? "-mx-1.5 px-1.5 bg-secondary-500/10" : ""}`}>
      {highlighted && (
        <svg aria-hidden="true" className="arazzo-marching-ants pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <rect width="100%" height="100%" rx="4" />
        </svg>
      )}
      <dt className="font-mono text-xs text-foreground break-all">{output.name}</dt>
      {/* text-xs like the name, so the chip's line lines up with it instead of sitting on a body-text line. */}
      <dd className="min-w-0 text-xs">
        <ValueText value={output.value} />
        <div>
          <UsedBy uses={model.consumers[valueKey]} workflowId={workflowId} />
        </div>
      </dd>
    </div>
  );
}

/** What a step or workflow produces, and which steps read each value. */
function OutputList({
  outputs,
  label = "Outputs",
  model,
  workflowId,
  stepId,
}: {
  outputs: ArazzoOutput[];
  label?: string;
  model: ArazzoModel;
  workflowId: string;
  /** Absent for the workflow's own outputs. */
  stepId?: string;
}) {
  if (outputs.length === 0) return null;
  return (
    <div>
      <Heading>{label}</Heading>
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1">
        {outputs.map((output) => (
          <OutputRow
            key={output.name}
            output={output}
            model={model}
            workflowId={workflowId}
            valueKey={stepId === undefined ? dataFlowKey.workflowOutput(workflowId, output.name) : dataFlowKey.stepOutput(workflowId, stepId, output.name)}
          />
        ))}
      </dl>
    </div>
  );
}

function InputRow({ name, valueKey, uses, workflowId }: { name: string; valueKey: string; uses: ArazzoValueUse[]; workflowId: string }) {
  const highlighted = useIsHighlighted(valueKey);
  return (
    <li className={`flex flex-wrap items-center gap-x-2 rounded px-1 ${highlighted ? "bg-primary-500/10" : ""}`}>
      <span className="font-mono text-xs text-foreground">{name}</span>
      <UsedBy uses={uses} workflowId={workflowId} />
    </li>
  );
}

/** Which steps read each workflow input. */
function InputUses({ model, workflowId }: { model: ArazzoModel; workflowId: string }) {
  const inputs = inputUses(model, workflowId);
  if (inputs.length === 0) return null;
  return (
    <ul aria-label="Where inputs are used" className="mt-2 space-y-0.5 border-t border-border pt-2">
      {inputs.map((input) => (
        <InputRow key={input.valueKey} {...input} workflowId={workflowId} />
      ))}
    </ul>
  );
}

/** Parameters the step sends. Workflow-level ones apply to every step, and say so. */
function ParameterTable({ parameters }: { parameters: ArazzoParameter[] }) {
  if (parameters.length === 0) return null;
  return (
    <div>
      <Heading>Parameters</Heading>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left">
          <tbody className="divide-y divide-border">
            {parameters.map((parameter) => {
              const fromWorkflow = !parameter.path.includes("steps");
              return (
                <tr key={parameter.path.join("/")} className="align-middle">
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground whitespace-nowrap">
                    {parameter.name || <UnavailableBadge label="Missing" reason={parameter.component?.reference} />}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-foreground-muted whitespace-nowrap">{parameter.in ?? "input"}</td>
                  {/* text-xs like the other cells, so the line box fits the chip instead of the body text. */}
                  <td className="px-3 py-1.5 w-full min-w-0 text-xs">
                    <ValueText value={parameter.value} />
                    {(fromWorkflow || parameter.component) && (
                      <span className="ml-2 text-[10px] text-foreground-muted">
                        {fromWorkflow ? "from workflow" : "from components"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestBody({ step }: { step: ArazzoStep }) {
  const body = step.requestBody;
  if (!body || (!body.payload && body.replacements.length === 0)) return null;
  return (
    <div>
      <Heading>Request body{body.contentType ? ` (${body.contentType})` : ""}</Heading>
      {body.payload && <PayloadBlock value={body.payload} contentType={body.contentType} />}
      {body.replacements.length > 0 && (
        <ul className="mt-2 space-y-1">
          {body.replacements.map((replacement) => (
            <li key={replacement.path.join("/")} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-foreground-muted">Set</span>
              <code className="font-mono text-foreground">{replacement.target}</code>
              <span className="text-foreground-muted">to</span>
              <ValueText value={replacement.value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A collapsible block, for a workflow from another Arazzo document shown inline. */
function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 bg-neutral-50 text-left hover:bg-neutral-100 transition-colors"
      >
        <span className="min-w-0 flex-1">{summary}</span>
        {expanded ? (
          <IconArrowDown className="w-3 h-3 shrink-0 text-foreground-muted" />
        ) : (
          <IconArrowRight className="w-3 h-3 shrink-0 text-foreground-muted" />
        )}
      </button>
      <div id={panelId} hidden={!expanded} className="border-t border-border px-4">
        {expanded && children}
      </div>
    </div>
  );
}

/** What the step calls: the embedded operation, a workflow, or why it couldn't be linked. */
function StepTarget({ step, model, anchorId }: { step: ArazzoStep; model: ArazzoModel; anchorId: string }) {
  const { target } = step;

  if (target.status === "unlinked") {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {target.via && <span className="text-xs text-foreground-muted">{target.via}</span>}
          {target.ref && <code className="font-mono text-xs text-foreground break-all">{target.ref}</code>}
          <UnavailableBadge reason={target.message} />
        </div>
        <p className="mt-1 text-xs text-foreground-muted">{target.message}</p>
      </div>
    );
  }

  if (target.kind === "operation") {
    const source = model.sources.find((item) => item.name === target.sourceName);
    if (source?.status !== "resolved" || source.type !== "openapi") return null;
    return <StepOperation target={target} source={source.document} anchorId={anchorId} />;
  }

  if (!target.sourceName) {
    const called = model.workflows.find((workflow) => workflow.workflowId === target.workflowId);
    return (
      <div className="rounded-lg border border-border bg-neutral-50 px-3 py-2.5 text-xs">
        <span className="text-foreground-muted">Runs workflow </span>
        <ArazzoLink to={workflowKey(target.workflowId)}>{target.workflowId}</ArazzoLink>
        {called?.summary && <span className="text-foreground-secondary"> · {called.summary}</span>}
      </div>
    );
  }

  const source = model.sources.find((item) => item.name === target.sourceName);
  const external = source?.status === "resolved" && source.type === "arazzo"
    ? source.model.workflows.find((workflow) => workflow.workflowId === target.workflowId)
    : undefined;
  const summary = (
    <span className="text-xs">
      <span className="text-foreground-muted">Runs workflow </span>
      <span className="font-mono text-foreground">{target.workflowId}</span>
      <span className="text-foreground-muted"> from </span>
      <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-foreground-secondary">{target.sourceName}</span>
      {external?.summary && <span className="text-foreground-secondary"> · {external.summary}</span>}
    </span>
  );
  if (!external || source?.status !== "resolved" || source.type !== "arazzo") return <div className="rounded-lg border border-border px-3 py-2.5">{summary}</div>;
  return (
    <Disclosure summary={summary}>
      <ArazzoLinksProvider scope={`${anchorId}::`}>
        <WorkflowView workflow={external} model={source.model} nested />
      </ArazzoLinksProvider>
    </Disclosure>
  );
}

function StepView({ step, number, workflowId, model }: { step: ArazzoStep; number: number; workflowId: string; model: ArazzoModel }) {
  const { scope, selectedKey } = useArazzoLinks();
  const key = stepKey(workflowId, step.stepId);
  const anchorId = stepAnchor(workflowId, step.stepId, scope);
  const isSelected = !scope && selectedKey === key;

  // Lit while a chip reading one of this step's outputs (producer), or a
  // value this step reads (consumer), is pointed at.
  const [produces, consumes] = useMemo(() => {
    const reads = stepSites(step).flatMap(({ expression }) => (expression.target?.valueKey ? [expression.target.valueKey] : []));
    return [new Set(step.outputs.map((output) => dataFlowKey.stepOutput(workflowId, step.stepId, output.name))), new Set(reads)];
  }, [step, workflowId]);
  const role = useHighlightRole(produces, consumes);
  const ring =
    role === "producer"
      ? "border-secondary-500 ring-2 ring-secondary-500/40"
      : role === "consumer"
        ? "border-primary-500/60 ring-1 ring-primary-500/30"
        : isSelected
          ? "border-primary-300 ring-1 ring-primary-200"
          : "border-border";

  return (
    <li
      id={anchorId}
      data-flow-role={role ?? undefined}
      className={`relative scroll-mt-24 rounded-lg border bg-surface transition-shadow ${ring}`}
    >
      <ErrorBoundary resetKey={step} fallback={<p role="alert" className="p-4 text-sm">This step could not be rendered. Other steps are still available.</p>}>
        <header className="flex items-center gap-3 px-4 pt-3">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold tabular-nums text-foreground-secondary"
          >
            {number}
          </span>
          <h4
            aria-label={`Step ${number}: ${step.stepId}`}
            className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-foreground"
          >
            {step.stepId}
          </h4>
        </header>
        <div className="space-y-4 px-4 pb-4 pt-3">
          {step.description && <Markdown className="prose-sm">{step.description}</Markdown>}
          <StepTarget step={step} model={model} anchorId={anchorId} />
          <ParameterTable parameters={step.parameters} />
          <RequestBody step={step} />
          {step.successCriteria.length > 0 && (
            <div>
              <Heading>Succeeds when</Heading>
              <CriteriaList criteria={step.successCriteria} />
            </div>
          )}
          <ActionList actions={step.onSuccess} label="On success" workflowId={workflowId} />
          <ActionList actions={step.onFailure} label="On failure" workflowId={workflowId} />
          <OutputList outputs={step.outputs} model={model} workflowId={workflowId} stepId={step.stepId} />
        </div>
      </ErrorBoundary>
    </li>
  );
}

interface WorkflowViewProps {
  workflow: ArazzoWorkflow;
  /** The model the workflow belongs to: the page's, or an Arazzo source's for a workflow shown inline. */
  model: ArazzoModel;
  /** A workflow from another document, shown inside a step: smaller heading. */
  nested?: boolean;
}

/** One workflow in full: inputs, numbered steps, workflow-level actions and outputs. */
export function WorkflowView({ workflow, model, nested = false }: WorkflowViewProps) {
  const { scope, selectedKey } = useArazzoLinks();
  const key = workflowKey(workflow.workflowId);
  const isSelected = !scope && selectedKey === key;
  const HeadingTag = nested ? "h4" : "h3";
  // One per workflow: data flows between a workflow's own steps.
  const [highlight] = useState(() => new DataFlowHighlight());

  return (
    <DataFlowHighlightContext.Provider value={highlight}>
      <section id={workflowAnchor(workflow.workflowId, scope)} className="scroll-mt-24 py-4" aria-label={`Workflow ${workflow.workflowId}`}>
        <div className={`-ml-3.5 border-l-2 pl-3 ${isSelected ? "border-primary-500" : "border-transparent"}`}>
          <HeadingTag className={`${nested ? "text-base" : "text-xl"} font-bold text-foreground`}>
            {workflow.summary ?? workflow.workflowId}
          </HeadingTag>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
            <code className="font-mono">{workflow.workflowId}</code>
            <span>·</span>
            <span>
              {workflow.steps.length} {workflow.steps.length === 1 ? "step" : "steps"}
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-5">
          {workflow.description && <Markdown>{workflow.description}</Markdown>}
          {workflow.dependsOn.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-foreground-muted">Runs after</span>
              {workflow.dependsOn.map((link) => (
                <WorkflowRef key={link.ref} link={link} />
              ))}
            </div>
          )}
          {workflow.inputs && (
            <div>
              <Heading>Inputs</Heading>
              <div className="rounded-md border border-border px-3 py-2">
                <SchemaTree schema={workflow.inputs} rootName="inputs" />
                <InputUses model={model} workflowId={workflow.workflowId} />
              </div>
            </div>
          )}
          <div>
            <Heading>Steps</Heading>
            <ol className="space-y-3">
              {workflow.steps.map((step, index) => (
                <StepView key={`${index}-${step.stepId}`} step={step} number={index + 1} workflowId={workflow.workflowId} model={model} />
              ))}
            </ol>
          </div>
          <ActionList actions={workflow.successActions} label="On success (every step)" workflowId={workflow.workflowId} />
          <ActionList actions={workflow.failureActions} label="On failure (every step)" workflowId={workflow.workflowId} />
          <OutputList outputs={workflow.outputs} label="Workflow outputs" model={model} workflowId={workflow.workflowId} />
        </div>
      </section>
    </DataFlowHighlightContext.Provider>
  );
}
