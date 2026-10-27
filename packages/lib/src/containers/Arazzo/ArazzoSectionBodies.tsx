import { ErrorBoundary } from "../../components/ErrorBoundary";
import Section, { type SectionLayout } from "../../components/Section";
import { useArazzoDocumentContext } from "../../contexts";
import type { ArazzoModel, ArazzoWorkflow } from "../../types/arazzo";
import InformationSection from "../Information/InformationSection";
import { useNotFoundWarning } from "../../public/useNotFoundWarning";
import { ArazzoSources, WorkflowList } from "./ArazzoOverview";
import { WorkflowView } from "./Workflow";

/*
 * What the Arazzo page and its section components render, given a model from
 * the surrounding ArazzoDocumentProvider. Loaded on demand, like the page.
 */

/** One workflow in full, in a page section. A workflow that fails to render doesn't take the others down. */
export function WorkflowSection({ workflow, model, layout }: { workflow: ArazzoWorkflow; model: ArazzoModel; layout?: SectionLayout }) {
  return (
    <div className="flex justify-center w-full">
      <Section
        stickySideContent={false}
        bottomSpacing={false}
        layout={layout}
        content={
          <ErrorBoundary
            resetKey={workflow}
            fallback={<p role="alert">This workflow could not be rendered. Other workflows are still available.</p>}
          >
            <WorkflowView workflow={workflow} model={model} />
          </ErrorBoundary>
        }
      />
    </div>
  );
}

/** The document's title and description, then a chip per source. */
export function ArazzoInfoBody({ layout, showLogo }: { layout?: SectionLayout; showLogo?: boolean }) {
  const { model } = useArazzoDocumentContext();
  return (
    <>
      <div id="info-panel">
        <InformationSection
          title={model.info.title}
          description={model.info.description ?? model.info.summary}
          extensionsSource={model.info}
          showLogo={showLogo}
          layout={layout}
        />
      </div>
      <ArazzoSources sources={model.sources} layout={layout} />
    </>
  );
}

/** Every workflow: the list at a glance, then each one in full. */
export function ArazzoWorkflowsBody({ layout }: { layout?: SectionLayout }) {
  const { model } = useArazzoDocumentContext();
  return (
    <>
      <WorkflowList workflows={model.workflows} layout={layout} />
      {model.workflows.map((workflow) => (
        <WorkflowSection key={workflow.workflowId} workflow={workflow} model={model} layout={layout} />
      ))}
    </>
  );
}

/** One workflow, by `workflowId`. Nothing (and a console warning) when there's no such workflow. */
export function ArazzoWorkflowBody({ workflowId, layout }: { workflowId: string; layout?: SectionLayout }) {
  const { model } = useArazzoDocumentContext();
  const workflow = model.workflows.find((item) => item.workflowId === workflowId);
  useNotFoundWarning(!workflow, `ArazzoWorkflowSection: no workflow "${workflowId}" in the Arazzo document.`);
  if (!workflow) return null;
  return <WorkflowSection workflow={workflow} model={model} layout={layout} />;
}
