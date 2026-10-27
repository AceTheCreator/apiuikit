import Section, { type SectionLayout } from "../../components/Section";
import { sourceAnchor, workflowKey } from "../../helpers/arazzoAnchors";
import type { ArazzoSource, ArazzoWorkflow } from "../../types/arazzo";
import { useArazzoLinks } from "./arazzoLinksContext";
import { UnavailableBadge } from "./ArazzoValue";

const TYPE_LABEL: Record<string, string> = { openapi: "OpenAPI", arazzo: "Arazzo", asyncapi: "AsyncAPI" };

/**
 * One chip per source description: its name, type, and whether it could be
 * loaded. Reasons for unavailable ones are spelled out beneath, not only on
 * hover, so they're readable on touch screens too.
 */
export function ArazzoSources({ sources, layout }: { sources: ArazzoSource[]; layout?: SectionLayout }) {
  if (sources.length === 0) return null;
  const unresolved = sources.filter((source) => source.status === "unresolved");

  const content = (
    <div id="sources">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">Sources</p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <li
            key={source.name || source.path.join("/")}
            id={sourceAnchor(source.name)}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs"
            title={source.url ?? source.description.url}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${source.status === "resolved" ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="truncate font-mono text-foreground">{source.name}</span>
            {source.type && <span className="text-foreground-muted">{TYPE_LABEL[source.type] ?? source.type}</span>}
            {source.status === "unresolved" && <UnavailableBadge reason={source.message} />}
          </li>
        ))}
      </ul>
      {unresolved.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {unresolved.map((source) => (
            <li key={source.name || source.path.join("/")} className="text-xs text-foreground-muted">
              <span className="font-mono text-foreground-secondary">{source.name}</span>:{" "}
              {source.status === "unresolved" && source.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex justify-center w-full">
      <Section content={content} stickySideContent={false} layout={layout} bottomSpacing={false} />
    </div>
  );
}

/** Every workflow at a glance; choosing one jumps to its detail below. */
export function WorkflowList({ workflows, layout }: { workflows: ArazzoWorkflow[]; layout?: SectionLayout }) {
  const { goTo } = useArazzoLinks();
  if (workflows.length === 0) return null;

  const content = (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden">
      {workflows.map((workflow) => {
        const inputs = Object.keys(workflow.inputs?.properties ?? {});
        return (
          <li key={workflow.workflowId}>
            <button
              type="button"
              onClick={() => goTo(workflowKey(workflow.workflowId))}
              className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
            >
              <span className="block text-sm font-semibold text-foreground">{workflow.summary ?? workflow.workflowId}</span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
                <code className="font-mono">{workflow.workflowId}</code>
                <span>·</span>
                <span>
                  {workflow.steps.length} {workflow.steps.length === 1 ? "step" : "steps"}
                </span>
                {inputs.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="min-w-0 truncate">
                      inputs: <span className="font-mono">{inputs.join(", ")}</span>
                    </span>
                  </>
                )}
                {workflow.dependsOn.length > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      after <span className="font-mono">{workflow.dependsOn.map((link) => link.status === "linked" ? link.workflowId : link.ref).join(", ")}</span>
                    </span>
                  </>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex justify-center w-full">
      <Section title="Workflows" content={content} stickySideContent={false} layout={layout} />
    </div>
  );
}
