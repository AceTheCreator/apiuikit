import type { ArazzoModel, ArazzoStep } from "../types/arazzo";
import { arazzoKeyAnchor, stepKey, workflowKey } from "./arazzoAnchors";
import { normalizeString, SearchEntry } from "./searchIndex";

/** What a step calls, as words: `GET /pets (petstore)`, `workflow place-order`, or the raw reference. */
export function describeStepTarget(step: ArazzoStep): string {
  const { target } = step;
  if (target.status === "linked" && target.kind === "operation") {
    return `${target.method.toUpperCase()} ${target.path}`;
  }
  if (target.status === "linked" && target.kind === "workflow") return `workflow ${target.workflowId}`;
  return target.ref;
}

/** Mirrors buildOpenAPISearchIndex: the info panel, then one entry per workflow and per step. */
export function buildArazzoSearchIndex(model: ArazzoModel): SearchEntry[] {
  const entries: SearchEntry[] = [];

  if (model.info) {
    entries.push({
      id: "info-panel",
      targetId: "info-panel",
      type: "info",
      tab: "info",
      key: "info",
      name: model.info.title ?? "Info",
      path: "info",
      location: "Info",
      subtitle: model.info.summary ?? model.info.description,
      text: normalizeString([model.info, model.sources.map((source) => [source.name, source.url])]),
    });
  }

  model.workflows.forEach((workflow, index) => {
    const key = workflowKey(workflow.workflowId);
    const title = workflow.summary ?? workflow.workflowId;
    entries.push({
      id: `workflow-${key}`,
      targetId: arazzoKeyAnchor(key),
      type: "workflow",
      tab: "workflows",
      key,
      name: title,
      path: `workflows[${index}]`,
      location: `Workflows > ${workflow.workflowId}`,
      subtitle: workflow.description,
      text: normalizeString([
        workflow.workflowId,
        workflow.summary,
        workflow.description,
        workflow.outputs.map((output) => output.name),
        Object.keys(workflow.inputs?.properties ?? {}),
      ]),
    });

    workflow.steps.forEach((step, stepIndex) => {
      const key = stepKey(workflow.workflowId, step.stepId);
      const target = step.target;
      entries.push({
        id: `step-${key}`,
        targetId: arazzoKeyAnchor(key),
        type: "step",
        tab: "workflows",
        key,
        name: step.stepId,
        path: `workflows[${index}].steps[${stepIndex}]`,
        location: `Workflows > ${workflow.workflowId} > ${stepIndex + 1}. ${step.stepId}`,
        subtitle: describeStepTarget(step),
        text: normalizeString([
          step.stepId,
          step.description,
          target.ref,
          target.status === "linked" && target.kind === "operation"
            ? [target.method, target.path, target.sourceName, target.operation.operationId, target.operation.summary]
            : undefined,
          step.parameters.map((parameter) => parameter.name),
          step.outputs.map((output) => output.name),
        ]),
      });
    });
  });

  return entries;
}
