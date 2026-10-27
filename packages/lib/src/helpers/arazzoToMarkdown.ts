/**
 * Serializes a resolved Arazzo model (see types/arazzo.ts) into Markdown: the
 * same content the Arazzo page shows, as prose an LLM can follow. Each step
 * says what it calls (method and path once its source is resolved, the
 * reference as written otherwise), what it sends, when it succeeds, what
 * happens next, and what it outputs. Runtime expressions keep their original
 * spelling, in code spans.
 *
 * Works on the model rather than the document because describing a step needs
 * its source loaded, which is asynchronous: resolve first with
 * `resolveArazzoDocument`, then serialize. Pure and synchronous, so the same
 * model always gives the same output.
 */
import type {
  ArazzoAction,
  ArazzoCriterion,
  ArazzoModel,
  ArazzoOutput,
  ArazzoParameter,
  ArazzoSource,
  ArazzoStep,
  ArazzoValue,
  ArazzoWorkflow,
  ArazzoWorkflowLink,
} from "../types/arazzo";

const heading = (level: number, text: string) => `${"#".repeat(Math.min(level, 6))} ${text}`;

/** An inline code span; backticks inside would end it early. */
const code = (text: string) => `\`${text.replace(/`/g, "'")}\``;

/** Text inside a table cell, where a bare pipe would start a new cell. */
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

const SOURCE_TYPE_LABEL: Record<string, string> = { openapi: "OpenAPI", arazzo: "Arazzo", asyncapi: "AsyncAPI" };

/**
 * A plain copy safe for JSON.stringify: `inputs` schemas have their `$ref`s
 * inlined, and a recursive schema inlines into a cycle. A node that would
 * repeat one of its own ancestors is cut off there. The `x-parser-*` keys the
 * inlining stamps on (see resolveDocument) are dropped, as the JSON tab does.
 */
function toPlain(value: unknown, ancestors: unknown[] = []): unknown {
  if (typeof value !== "object" || value === null) return value;
  if (ancestors.includes(value)) {
    const name = (value as Record<string, unknown>)["x-parser-schema-id"];
    return { $comment: typeof name === "string" ? `recursive: ${name}` : "recursive" };
  }
  const next = [...ancestors, value];
  if (Array.isArray(value)) return value.map((item) => toPlain(item, next));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith("x-parser-"))
      .map(([key, item]) => [key, toPlain(item, next)]),
  );
}

const jsonBlock = (value: unknown) => `\`\`\`json\n${JSON.stringify(toPlain(value), null, 2)}\n\`\`\``;

/** A value inline: expressions and templates as written, literals as JSON unless they're plain text. */
function valueText(value: ArazzoValue): string {
  switch (value.kind) {
    case "expression":
      return code(value.expression.text);
    case "template":
      return code(value.raw);
    default:
      return code(typeof value.raw === "string" ? value.raw : JSON.stringify(toPlain(value.raw)));
  }
}

function criterionText(criterion: ArazzoCriterion): string {
  if (criterion.type === "simple") return code(criterion.condition);
  const type = criterion.version ? `${criterion.type} ${criterion.version}` : criterion.type;
  const context = criterion.context ? `${valueText(criterion.context)} ` : "";
  return `${context}matches ${type} ${code(criterion.condition)}`;
}

const criteriaText = (criteria: ArazzoCriterion[]) => criteria.map(criterionText).join(" and ");

function workflowLinkText(link: ArazzoWorkflowLink): string {
  if (link.status === "unlinked") return `${code(link.ref)} (unavailable: ${link.message})`;
  return link.sourceName ? `${code(link.workflowId)} from source ${code(link.sourceName)}` : code(link.workflowId);
}

/** What an action does next: "go to step `page`", "retry after 2s, up to 5 times", "end the workflow". */
function actionEffect(action: ArazzoAction): string {
  const target =
    action.stepId !== undefined
      ? `step ${code(action.stepId)}${action.stepFound ? "" : " (no such step in this workflow)"}`
      : action.workflow
        ? `workflow ${workflowLinkText(action.workflow)}`
        : undefined;

  if (action.type === "goto") return target ? `go to ${target}` : "go to (no target)";
  if (action.type === "retry") {
    const timing = [
      action.retryAfter !== undefined ? `after ${action.retryAfter}s` : undefined,
      action.retryLimit !== undefined ? `up to ${action.retryLimit} ${action.retryLimit === 1 ? "time" : "times"}` : undefined,
    ].filter(Boolean);
    return `retry${timing.length ? ` ${timing.join(", ")}` : ""}${target ? ` from ${target}` : ""}`;
  }
  if (action.type === "end") return "end the workflow";
  return action.type || "unknown action";
}

function actionsToMarkdown(label: string, actions: ArazzoAction[]): string | undefined {
  if (actions.length === 0) return undefined;
  const lines = actions.map((action) => {
    const name = action.name ? `${code(action.name)}: ` : action.component ? `${code(action.component.reference)}: ` : "";
    const when = action.criteria.length ? ` when ${criteriaText(action.criteria)}` : "";
    return `- ${name}${actionEffect(action)}${when}`;
  });
  return [`**${label}:**`, "", ...lines].join("\n");
}

function outputsToMarkdown(label: string, outputs: ArazzoOutput[]): string | undefined {
  if (outputs.length === 0) return undefined;
  return [`**${label}:**`, "", ...outputs.map((output) => `- ${code(output.name)}: ${valueText(output.value)}`)].join("\n");
}

function parametersToMarkdown(parameters: ArazzoParameter[]): string | undefined {
  if (parameters.length === 0) return undefined;
  const rows = parameters.map((parameter) => {
    const name = parameter.name ? code(parameter.name) : `missing (${code(parameter.component?.reference ?? "?")})`;
    return `| ${cell(name)} | ${parameter.in ?? "input"} | ${cell(valueText(parameter.value))} |`;
  });
  return ["**Parameters:**", "", "| Name | In | Value |", "| --- | --- | --- |", ...rows].join("\n");
}

function requestBodyToMarkdown(step: ArazzoStep): string | undefined {
  const body = step.requestBody;
  if (!body || (!body.payload && body.replacements.length === 0)) return undefined;
  const parts = [`**Request body**${body.contentType ? ` (${code(body.contentType)})` : ""}:`];
  if (body.payload) {
    const raw = body.payload.raw;
    if (body.payload.kind === "expression") parts.push(valueText(body.payload));
    else if (typeof raw === "string") {
      const language = body.contentType?.includes("json") ? "json" : body.contentType?.includes("xml") ? "xml" : "";
      parts.push(`\`\`\`${language}\n${raw.trimEnd()}\n\`\`\``);
    }
    else parts.push(jsonBlock(raw));
  }
  if (body.replacements.length) {
    parts.push(
      ["With replacements:", "", ...body.replacements.map((item) => `- ${code(item.target)}: ${valueText(item.value)}`)].join("\n"),
    );
  }
  return parts.join("\n\n");
}

/** One line saying what the step calls. */
function targetToMarkdown(step: ArazzoStep, model: ArazzoModel): string {
  const { target } = step;
  if (target.status === "unlinked") {
    const written = target.ref ? `${target.via ? `${target.via} ` : ""}${code(target.ref)}` : "nothing";
    return `**Calls:** ${written} (unavailable: ${target.message})`;
  }
  if (target.kind === "operation") {
    const address = target.isWebhook
      ? `${code(target.method.toUpperCase())} webhook ${code(target.path)}`
      : code(`${target.method.toUpperCase()} ${target.path}`);
    const operationId = target.operation.operationId ? `operation ${code(target.operation.operationId)} ` : "";
    const summary = target.operation.summary ? `: ${target.operation.summary}` : "";
    return `**Calls:** ${address} (${operationId}in source ${code(target.sourceName)})${summary}`;
  }
  const called = target.sourceName
    ? undefined
    : model.workflows.find((workflow) => workflow.workflowId === target.workflowId);
  const summary = called?.summary ? `: ${called.summary}` : "";
  return `**Runs workflow:** ${workflowLinkText(target)}${summary}`;
}

function stepToMarkdown(step: ArazzoStep, number: number, model: ArazzoModel, level: number): string {
  const sections = [heading(level, `Step ${number}: ${code(step.stepId)}`)];
  if (step.description) sections.push(step.description.trim());
  sections.push(targetToMarkdown(step, model));
  const details = [
    parametersToMarkdown(step.parameters),
    requestBodyToMarkdown(step),
    step.successCriteria.length
      ? ["**Succeeds when:**", "", ...step.successCriteria.map((criterion) => `- ${criterionText(criterion)}`)].join("\n")
      : undefined,
    actionsToMarkdown("On success", step.onSuccess),
    actionsToMarkdown("On failure", step.onFailure),
    outputsToMarkdown("Outputs", step.outputs),
  ];
  return [...sections, ...details.filter((part): part is string => !!part)].join("\n\n");
}

/** A workflow's body, its own heading at `level` and its steps one below. `intro` goes under the heading. */
function workflowToMarkdown(workflow: ArazzoWorkflow, model: ArazzoModel, level: number, intro?: string): string {
  const sections = [heading(level, workflow.summary ?? workflow.workflowId)];
  if (intro) sections.push(intro);
  const stepCount = `${workflow.steps.length} ${workflow.steps.length === 1 ? "step" : "steps"}`;
  sections.push(`**Workflow ID:** ${code(workflow.workflowId)} · ${stepCount}`);
  if (workflow.description) sections.push(workflow.description.trim());
  if (workflow.dependsOn.length) sections.push(`**Runs after:** ${workflow.dependsOn.map(workflowLinkText).join(", ")}`);
  if (workflow.inputs) sections.push(["**Inputs** (JSON Schema):", "", jsonBlock(workflow.inputs)].join("\n"));
  sections.push(...workflow.steps.map((step, index) => stepToMarkdown(step, index + 1, model, level + 1)));
  const closing = [
    actionsToMarkdown("On success (every step)", workflow.successActions),
    actionsToMarkdown("On failure (every step)", workflow.failureActions),
    outputsToMarkdown("Workflow outputs", workflow.outputs),
  ];
  return [...sections, ...closing.filter((part): part is string => !!part)].join("\n\n");
}

function sourceLine(source: ArazzoSource): string {
  const type = source.type ? ` (${SOURCE_TYPE_LABEL[source.type] ?? source.type})` : "";
  const url = source.description.url ? `: ${code(source.description.url)}` : "";
  const status = source.status === "unresolved" ? `. Unavailable: ${source.message}` : "";
  return `- ${code(source.name)}${type}${url}${status}`;
}

const versionLine = (model: ArazzoModel) =>
  `**Version:** ${model.info.version ?? "unknown"} · **Arazzo:** ${model.arazzo}`;

/** The whole document: info, sources, an index of workflows, then each workflow in full. */
export function arazzoToMarkdown(model: ArazzoModel): string {
  const sections = [heading(1, model.info.title ?? "Workflows"), versionLine(model)];
  if (model.info.summary) sections.push(model.info.summary.trim());
  if (model.info.description) sections.push(model.info.description.trim());

  if (model.sources.length) sections.push([heading(2, "Sources"), "", ...model.sources.map(sourceLine)].join("\n"));

  if (model.workflows.length) {
    const index = model.workflows.map((workflow) => {
      const title = workflow.summary ? `: ${workflow.summary}` : "";
      return `- ${code(workflow.workflowId)}${title} (${workflow.steps.length} ${workflow.steps.length === 1 ? "step" : "steps"})`;
    });
    sections.push([heading(2, "Workflows"), "", ...index].join("\n"));
    sections.push(...model.workflows.map((workflow) => workflowToMarkdown(workflow, model, 2)));
  }

  return sections.join("\n\n") + "\n";
}

/**
 * One workflow on its own, for a page per workflow: the workflow in full,
 * plus the sources its steps call. Throws when the model has no such workflow.
 */
export function arazzoWorkflowToMarkdown(model: ArazzoModel, workflowId: string): string {
  const workflow = model.workflows.find((item) => item.workflowId === workflowId);
  if (!workflow) throw new Error(`[apiuikit] The Arazzo document has no workflow "${workflowId}".`);

  const used = new Set(workflow.steps.map((step) => step.target.sourceName).filter((name): name is string => !!name));
  const sources = model.sources.filter((source) => used.has(source.name));

  const intro = `From ${model.info.title ?? "an Arazzo document"}, version ${model.info.version ?? "unknown"} (Arazzo ${model.arazzo}).`;
  const sections = [workflowToMarkdown(workflow, model, 1, intro)];
  if (sources.length) sections.push([heading(2, "Sources"), "", ...sources.map(sourceLine)].join("\n"));
  return sections.join("\n\n") + "\n";
}
