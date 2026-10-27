import type {
  ArazzoAction,
  ArazzoCriterion,
  ArazzoDiagnostic,
  ArazzoExpression,
  ArazzoExpressionTarget,
  ArazzoModel,
  ArazzoStep,
  ArazzoValue,
  ArazzoValueUse,
  ArazzoWorkflow,
} from "../types/arazzo";
import { stepKey, workflowKey } from "./arazzoAnchors";

/*
 * How data moves through a document: what each runtime expression reads, and
 * every place each value is read. Worked out after the model is built, since
 * an expression can name any step, output, workflow or source in it.
 */

/** The `valueKey`s of values a workflow or step produces. */
export const dataFlowKey = {
  input: (workflowId: string, name: string) => JSON.stringify(["inputs", workflowId, name]),
  stepOutput: (workflowId: string, stepId: string, name: string) => JSON.stringify(["steps", workflowId, stepId, name]),
  workflowOutput: (workflowId: string, name: string) => JSON.stringify(["outputs", workflowId, name]),
};

/** Every runtime expression in a value, in the order they're written. */
export function valueExpressions(value: ArazzoValue | undefined): ArazzoExpression[] {
  switch (value?.kind) {
    case "expression":
      return [value.expression];
    case "template":
      return value.parts.filter((part): part is ArazzoExpression => typeof part !== "string");
    case "structure":
      return value.expressions.flatMap(({ value: inner }) => valueExpressions(inner));
    default:
      return [];
  }
}

/** One expression where it's written, before its workflow and step are known. */
type Site = Omit<ArazzoValueUse, "workflowId" | "stepId">;

const criteriaSites = (criteria: ArazzoCriterion[], field: string): Site[] =>
  criteria.flatMap((criterion) => criterion.expressions.map((expression) => ({ field, expression, path: criterion.path })));

const actionSites = (actions: ArazzoAction[], field: string): Site[] => actions.flatMap((action) => criteriaSites(action.criteria, field));

/** Every expression a step reads, with where it's written. Workflow-level parameters are included, as the step sends them. */
export function stepSites(step: ArazzoStep): Site[] {
  const body = step.requestBody;
  return [
    ...step.parameters.flatMap((parameter) =>
      valueExpressions(parameter.value).map((expression) => ({ field: "parameters", expression, path: parameter.path })),
    ),
    ...valueExpressions(body?.payload).map((expression) => ({ field: "requestBody", expression, path: [...body!.path, "payload"] })),
    ...(body?.replacements ?? []).flatMap((replacement) =>
      valueExpressions(replacement.value).map((expression) => ({ field: "requestBody", expression, path: replacement.path })),
    ),
    ...criteriaSites(step.successCriteria, "successCriteria"),
    ...actionSites(step.onSuccess, "onSuccess"),
    ...actionSites(step.onFailure, "onFailure"),
    ...step.outputs.flatMap((output) => valueExpressions(output.value).map((expression) => ({ field: "outputs", expression, path: output.path }))),
  ];
}

/** Expressions the workflow itself reads: its workflow-level actions and its outputs. */
export function workflowSites(workflow: ArazzoWorkflow): Site[] {
  return [
    ...actionSites(workflow.successActions, "successActions"),
    ...actionSites(workflow.failureActions, "failureActions"),
    ...workflow.outputs.flatMap((output) =>
      valueExpressions(output.value).map((expression) => ({ field: "outputs", expression, path: output.path })),
    ),
  ];
}

/**
 * The declared value an expression reads: the one called `name`, or else the
 * longest one `name` starts with followed by "." (`created.projectId` reads
 * the `projectId` field of `created`). Names may contain dots, so the whole
 * name is tried first.
 */
function declaredName(name: string, isDeclared: (candidate: string) => boolean): string | undefined {
  for (let end = name.length; end > 0; end = name.lastIndexOf(".", end - 1)) {
    if (isDeclared(name.slice(0, end))) return name.slice(0, end);
  }
  return undefined;
}

/** The input of a workflow `name` reads, when its inputs schema lists `properties`. */
const inputName = (workflow: ArazzoWorkflow | undefined, name: string) => {
  const properties = workflow?.inputs?.properties;
  return (properties && declaredName(name, (candidate) => candidate in properties)) ?? name;
};

/** Whether a workflow's inputs schema declares `name`. Only a schema listing `properties`, with no others allowed, can rule one out. */
function inputProblem(workflow: ArazzoWorkflow, name: string): string | undefined {
  const schema = workflow.inputs;
  if (!schema) return `Workflow "${workflow.workflowId}" declares no inputs.`;
  const additional = (schema as { additionalProperties?: unknown }).additionalProperties;
  if (!schema.properties || (additional !== undefined && additional !== false)) return undefined;
  const properties = schema.properties;
  return declaredName(name, (candidate) => candidate in properties) ? undefined : `Workflow "${workflow.workflowId}" has no input "${name}".`;
}

/** The output `name` reads (see `declaredName`). */
const outputName = (outputs: { name: string }[] | undefined, name: string) =>
  (outputs && declaredName(name, (candidate) => outputs.some((output) => output.name === candidate))) ?? name;

const outputProblem = (outputs: { name: string }[], name: string, owner: string) =>
  declaredName(name, (candidate) => outputs.some((output) => output.name === candidate)) ? undefined : `${owner} has no output "${name}".`;

const EXCHANGE: Record<string, { kind: ArazzoExpressionTarget["kind"]; description: string }> = {
  RequestExpression: { kind: "request", description: "From this step's request" },
  ResponseExpression: { kind: "response", description: "From this step's response" },
  MessageExpression: { kind: "message", description: "From this step's message" },
  StatusCodeExpression: { kind: "status-code", description: "This step's response status code" },
  UrlExpression: { kind: "url", description: "This step's request URL" },
  MethodExpression: { kind: "method", description: "This step's HTTP method" },
  SelfExpression: { kind: "self", description: "This Arazzo document's URI" },
};

/** Works out what one expression reads, in the context of the workflow and step it's written in. */
function resolveTarget(
  expression: ArazzoExpression,
  model: ArazzoModel,
  workflow: ArazzoWorkflow,
  step: ArazzoStep | undefined,
): ArazzoExpressionTarget | undefined {
  const node = expression.node;
  if (!node) return undefined;
  const localWorkflow = (id: string) => model.workflows.find((item) => item.workflowId === id);

  switch (node.type) {
    case "InputsExpression":
      return {
        kind: "input",
        description: `Input "${node.name}" of workflow ${workflow.workflowId}`,
        valueKey: dataFlowKey.input(workflow.workflowId, inputName(workflow, node.name)),
        linkKey: workflowKey(workflow.workflowId),
        problem: inputProblem(workflow, node.name),
      };

    case "StepsExpression": {
      const producer = workflow.steps.find((item) => item.stepId === node.stepId);
      return {
        kind: "step-output",
        description: `Output "${node.outputName}" of step ${node.stepId}`,
        valueKey: dataFlowKey.stepOutput(workflow.workflowId, node.stepId, outputName(producer?.outputs, node.outputName)),
        linkKey: producer ? stepKey(workflow.workflowId, node.stepId) : undefined,
        problem: producer
          ? outputProblem(producer.outputs, node.outputName, `Step "${node.stepId}"`)
          : `There is no step "${node.stepId}" in workflow "${workflow.workflowId}".`,
      };
    }

    case "OutputsExpression": {
      // In a step that runs a workflow, `$outputs` reads that workflow's
      // outputs; anywhere else, the current workflow's.
      const called = step?.target.kind === "workflow" && step.target.status === "linked" ? step.target : undefined;
      if (called?.sourceName) {
        const source = model.sources.find((item) => item.name === called.sourceName);
        const external = source?.status === "resolved" && source.type === "arazzo"
          ? source.model.workflows.find((item) => item.workflowId === called.workflowId)
          : undefined;
        return {
          kind: "workflow-output",
          description: `Output "${node.name}" of workflow ${called.workflowId} in ${called.sourceName}`,
          problem: external ? outputProblem(external.outputs, node.name, `Workflow "${called.workflowId}"`) : undefined,
        };
      }
      const owner = called ? localWorkflow(called.workflowId) : workflow;
      if (!owner) return undefined;
      return {
        kind: "workflow-output",
        description: `Output "${node.name}" of workflow ${owner.workflowId}`,
        valueKey: dataFlowKey.workflowOutput(owner.workflowId, outputName(owner.outputs, node.name)),
        linkKey: workflowKey(owner.workflowId),
        problem: outputProblem(owner.outputs, node.name, `Workflow "${owner.workflowId}"`),
      };
    }

    case "WorkflowsExpression": {
      const owner = localWorkflow(node.workflowId);
      const missing = `There is no workflow "${node.workflowId}" in this document.`;
      if (node.field === "inputs") {
        return {
          kind: "input",
          description: `Input "${node.fieldName}" of workflow ${node.workflowId}`,
          valueKey: dataFlowKey.input(node.workflowId, inputName(owner, node.fieldName)),
          linkKey: owner ? workflowKey(owner.workflowId) : undefined,
          problem: owner ? inputProblem(owner, node.fieldName) : missing,
        };
      }
      return {
        kind: "workflow-output",
        description: `Output "${node.fieldName}" of workflow ${node.workflowId}`,
        valueKey: dataFlowKey.workflowOutput(node.workflowId, outputName(owner?.outputs, node.fieldName)),
        linkKey: owner ? workflowKey(owner.workflowId) : undefined,
        problem: owner ? outputProblem(owner.outputs, node.fieldName, `Workflow "${node.workflowId}"`) : missing,
      };
    }

    case "WorkflowsStepsExpression": {
      const owner = localWorkflow(node.workflowId);
      const found = owner?.steps.some((item) => item.stepId === node.stepId);
      return {
        kind: "step",
        description: `Step ${node.stepId} of workflow ${node.workflowId}`,
        linkKey: found ? stepKey(node.workflowId, node.stepId) : undefined,
        problem: found ? undefined : `There is no step "${node.stepId}" in workflow "${node.workflowId}".`,
      };
    }

    case "SourceDescriptionsExpression": {
      const found = model.sources.some((item) => item.name === node.sourceName);
      return {
        kind: "source",
        description: `Source description ${node.sourceName}`,
        sourceName: node.sourceName,
        problem: found ? undefined : `There is no source description "${node.sourceName}".`,
      };
    }

    case "ComponentsExpression": {
      const group = model.document.components?.[node.componentType];
      const found = !!group && typeof group === "object" && node.componentName in group;
      return {
        kind: "component",
        description: `Reusable ${node.componentType} "${node.componentName}" from components`,
        problem: found ? undefined : `There is no "${node.componentName}" in components.${node.componentType}.`,
      };
    }

    default:
      return EXCHANGE[node.type] && { ...EXCHANGE[node.type] };
  }
}

/** Broken inputs are warnings: an inputs schema is often looser than the flows that use it. */
const problemSeverity = (target: ArazzoExpressionTarget): 0 | 1 => (target.kind === "input" ? 1 : 0);

/**
 * Sets `target` on every expression in the model, and returns each value's
 * consumers (`ArazzoModel.consumers`) and a diagnostic per broken reference.
 */
export function linkDataFlow(model: ArazzoModel): { consumers: Record<string, ArazzoValueUse[]>; diagnostics: ArazzoDiagnostic[] } {
  const consumers: Record<string, ArazzoValueUse[]> = {};
  const diagnostics: ArazzoDiagnostic[] = [];
  // A workflow parameter or a component action appears under every step that
  // uses it; it's reported once.
  const reported = new Set<string>();

  const visit = (workflow: ArazzoWorkflow, step: ArazzoStep | undefined, site: Site) => {
    const target = resolveTarget(site.expression, model, workflow, step);
    if (!target) return;
    site.expression.target = target;
    if (target.valueKey) {
      (consumers[target.valueKey] ??= []).push({ workflowId: workflow.workflowId, stepId: step?.stepId, ...site });
    }
    const id = JSON.stringify([site.path, site.expression.text]);
    if (target.problem && !reported.has(id)) {
      reported.add(id);
      diagnostics.push({ message: `${site.expression.text}: ${target.problem}`, path: site.path, severity: problemSeverity(target) });
    }
  };

  for (const workflow of model.workflows) {
    for (const step of workflow.steps) {
      for (const site of stepSites(step)) visit(workflow, step, site);
    }
    for (const site of workflowSites(workflow)) visit(workflow, undefined, site);
  }
  return { consumers, diagnostics };
}

/** Each input of a workflow that something reads, with where, in the order first read. */
export function inputUses(model: ArazzoModel, workflowId: string): Array<{ name: string; valueKey: string; uses: ArazzoValueUse[] }> {
  return Object.entries(model.consumers).flatMap(([valueKey, uses]) => {
    const [kind, owner, name] = JSON.parse(valueKey) as string[];
    return kind === "inputs" && owner === workflowId ? [{ name, valueKey, uses }] : [];
  });
}
