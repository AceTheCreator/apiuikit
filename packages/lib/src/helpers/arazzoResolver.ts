import { readArazzoText } from "./arazzoDocumentParser";
import { linkDataFlow } from "./arazzoDataFlow";
import { ExpressionReader, loadExpressionParsers } from "./arazzoExpressions";
import { resolveSources, type SourceContext } from "./arazzoSources";
import { SUPPORTED_ARAZZO_VERSION, validateArazzo } from "./arazzoValidate";
import { findEndpoint } from "./findItem";
import { resolveLocalPointer } from "./jsonPointer";
import { resolveDocument } from "./resolveDocument";
import { HTTP_METHODS, type HttpMethod, type OpenAPIDocumentData, type OpenAPIPathItemData } from "../types/openapi";
import type {
  ArazzoAction,
  ArazzoComponentOrigin,
  ArazzoCriterion,
  ArazzoDiagnostic,
  ArazzoDocumentData,
  ArazzoModel,
  ArazzoOutput,
  ArazzoParameter,
  ArazzoParseResult,
  ArazzoRequestBody,
  ArazzoResolveOptions,
  ArazzoSource,
  ArazzoStep,
  ArazzoStepTarget,
  ArazzoUnlinked,
  ArazzoWorkflow,
  ArazzoWorkflowLink,
} from "../types/arazzo";

/*
 * Builds the resolved Arazzo model (see types/arazzo.ts): validates the
 * document, resolves its sources, inlines `$components` references, links each
 * step to what it calls, and parses every runtime expression. Framework
 * agnostic: no React, so Markdown export and tooling can use it too. Loaded
 * on demand through ./arazzoModel, which holds the public entry points.
 */

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// `$sourceDescriptions.<name>.<reference>`. Source names can't contain dots.
const SOURCE_REFERENCE = /^\$sourceDescriptions\.([^.]+)\.(.+)$/;
// `{$sourceDescriptions.<name>.url}#<pointer>`, braces optional.
const OPERATION_PATH = /^\{?\$sourceDescriptions\.([^.}]+)\.url\}?#(.*)$/;
// `$components.<type>.<name>`
const COMPONENT_REFERENCE = /^\$components\.(parameters|successActions|failureActions)\.(.+)$/;

// Forms other tools accept (Redocly's Museum example uses all three), read
// only after the standard form fails: `<name>.<operationId>`,
// `$sourceDescriptions.<name>#<pointer>` and
// `$sourceDescriptions.<name>.workflows.<workflowId>`.
const LOOSE_OPERATION_ID = /^([A-Za-z0-9_-]+)\.(.+)$/;
const LOOSE_OPERATION_PATH = /^\{?\$sourceDescriptions\.([^.}#]+)\}?#(.*)$/;
const LOOSE_WORKFLOW_ID = /^\$sourceDescriptions\.([^.]+)\.workflows\.(.+)$/;

const unlinked = (
  ref: string,
  reason: ArazzoUnlinked["reason"],
  message: string,
  sourceName?: string,
): ArazzoUnlinked => ({ status: "unlinked", ref, reason, message, sourceName });

interface FoundOperation {
  method: HttpMethod;
  path: string;
  isWebhook: boolean;
  pathItem: OpenAPIPathItemData;
}

function findOperationById(document: OpenAPIDocumentData, operationId: string): FoundOperation | null {
  for (const [key, isWebhook] of [["paths", false], ["webhooks", true]] as const) {
    const found = findEndpoint(document[key] ?? {}, { operationId });
    if (found) return { ...found, isWebhook };
  }
  return null;
}

/** Everything the per-document builders share. */
class DocumentBuilder {
  readonly diagnostics: ArazzoDiagnostic[] = [];
  readonly reader: ExpressionReader;
  private readonly sourcesByName: Map<string, ArazzoSource>;
  private readonly localWorkflowIds: Set<string>;

  constructor(
    private readonly document: ArazzoDocumentData,
    private readonly sources: ArazzoSource[],
    parsers: Awaited<ReturnType<typeof loadExpressionParsers>>,
  ) {
    this.reader = new ExpressionReader(parsers, this.diagnostics);
    this.sourcesByName = new Map(sources.map((source) => [source.name, source]));
    this.localWorkflowIds = new Set(
      list(document.workflows).flatMap((workflow) => (isObject(workflow) && typeof workflow.workflowId === "string" ? [workflow.workflowId] : [])),
    );
  }

  private error(message: string, path: string[]) {
    this.diagnostics.push({ message, path, severity: 0 });
  }

  private warning(message: string, path: string[]) {
    this.diagnostics.push({ message, path, severity: 1 });
  }

  /** The standard spelling of a step reference written in a form other tools accept, if it is one. */
  private standardReference(via: "operationId" | "operationPath" | "workflowId", ref: string): string | undefined {
    if (via === "operationId") {
      const match = LOOSE_OPERATION_ID.exec(ref);
      return match && this.sourcesByName.has(match[1]) ? `$sourceDescriptions.${match[1]}.${match[2]}` : undefined;
    }
    if (via === "operationPath") {
      const match = LOOSE_OPERATION_PATH.exec(ref);
      return match ? `{$sourceDescriptions.${match[1]}.url}#${match[2]}` : undefined;
    }
    const match = LOOSE_WORKFLOW_ID.exec(ref);
    return match ? `$sourceDescriptions.${match[1]}.${match[2]}` : undefined;
  }

  /** Looks up `$sourceDescriptions.<name>`, or explains why the target can't be linked through it. */
  private source(name: string, ref: string, wantedType: "openapi" | "arazzo"): ArazzoSource & { status: "resolved" } | ArazzoUnlinked {
    const source = this.sourcesByName.get(name);
    if (!source) return unlinked(ref, "unknown-source", `There is no source description named "${name}".`, name);
    if (source.status === "unresolved") {
      return unlinked(ref, "source-unavailable", `Source "${name}" couldn't be loaded, so this can't be shown.`, name);
    }
    if (source.type !== wantedType) {
      return unlinked(ref, "wrong-source-type", `Source "${name}" is ${source.type === "arazzo" ? "an Arazzo" : "an OpenAPI"} document, so it has no ${wantedType === "openapi" ? "operations" : "workflows"}.`, name);
    }
    return source;
  }

  linkOperationId(ref: string): ArazzoStepTarget {
    const qualified = SOURCE_REFERENCE.exec(ref);
    const linked = (sourceName: string, found: FoundOperation): ArazzoStepTarget => ({
      kind: "operation",
      status: "linked",
      via: "operationId",
      ref,
      sourceName,
      method: found.method,
      path: found.path,
      isWebhook: found.isWebhook,
      operation: found.pathItem[found.method]!,
      pathItem: found.pathItem,
    });

    if (qualified) {
      const [, name, operationId] = qualified;
      const source = this.source(name, ref, "openapi");
      if (source.status === "unlinked") return { kind: "operation", via: "operationId", ...source };
      const found = findOperationById(source.document as OpenAPIDocumentData, operationId);
      if (!found) return { kind: "operation", via: "operationId", ...unlinked(ref, "not-found", `Source "${name}" has no operation "${operationId}".`, name) };
      return linked(name, found);
    }

    const matches: Array<[string, FoundOperation]> = [];
    for (const source of this.sources) {
      if (source.status !== "resolved" || source.type !== "openapi") continue;
      const found = findOperationById(source.document, ref);
      if (found) matches.push([source.name, found]);
    }
    if (matches.length === 1) return linked(...matches[0]);
    if (matches.length > 1) {
      const names = matches.map(([name]) => `"${name}"`).join(", ");
      return {
        kind: "operation",
        via: "operationId",
        ...unlinked(ref, "ambiguous", `Operation "${ref}" exists in sources ${names}. Qualify it as $sourceDescriptions.<name>.${ref}.`),
      };
    }
    const unavailable = this.sources.find((source) => source.status === "unresolved" && source.type !== "arazzo");
    if (unavailable) {
      return {
        kind: "operation",
        via: "operationId",
        ...unlinked(ref, "source-unavailable", `Operation "${ref}" wasn't found, but source "${unavailable.name}" could not be loaded to check.`),
      };
    }
    return { kind: "operation", via: "operationId", ...unlinked(ref, "not-found", `No source has an operation "${ref}".`) };
  }

  linkOperationPath(ref: string): ArazzoStepTarget {
    const fail = (reason: ArazzoUnlinked["reason"], message: string, sourceName?: string): ArazzoStepTarget => ({
      kind: "operation",
      via: "operationPath",
      ...unlinked(ref, reason, message, sourceName),
    });
    const match = OPERATION_PATH.exec(ref);
    if (!match) {
      return fail("invalid-reference", `operationPath must look like {$sourceDescriptions.<name>.url}#/paths/~1pets/get.`);
    }
    const [, name, fragment] = match;
    const source = this.source(name, ref, "openapi");
    if (source.status === "unlinked") return { kind: "operation", via: "operationPath", ...source };

    const document = source.document as OpenAPIDocumentData;
    const pointer = `#${fragment}`;
    if (resolveLocalPointer(document, pointer) === undefined) {
      return fail("not-found", `Nothing in source "${name}" at ${fragment || "/"}.`, name);
    }
    const tokens = fragment.slice(1).split("/").map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
    const [section, path, method] = tokens;
    const isOperation =
      tokens.length === 3 && (section === "paths" || section === "webhooks") && (HTTP_METHODS as readonly string[]).includes(method);
    if (!isOperation) return fail("not-an-operation", `${fragment} in source "${name}" is not an operation.`, name);

    const pathItem = (document[section] as Record<string, OpenAPIPathItemData>)[path];
    return {
      kind: "operation",
      status: "linked",
      via: "operationPath",
      ref,
      sourceName: name,
      method: method as HttpMethod,
      path,
      isWebhook: section === "webhooks",
      operation: pathItem[method as HttpMethod]!,
      pathItem,
    };
  }

  linkWorkflow(ref: string): ArazzoWorkflowLink {
    const qualified = SOURCE_REFERENCE.exec(ref);
    if (!qualified) {
      if (this.localWorkflowIds.has(ref)) return { status: "linked", ref, workflowId: ref };
      return unlinked(ref, "not-found", `There is no workflow "${ref}" in this document.`);
    }
    const [, name, workflowId] = qualified;
    const source = this.source(name, ref, "arazzo");
    if (source.status === "unlinked") return source;
    const exists = source.type === "arazzo" && source.model.workflows.some((workflow) => workflow.workflowId === workflowId);
    if (!exists) return unlinked(ref, "not-found", `Source "${name}" has no workflow "${workflowId}".`, name);
    return { status: "linked", ref, workflowId, sourceName: name };
  }

  stepTarget(step: Json, path: string[]): ArazzoStepTarget {
    const targets = (["operationId", "operationPath", "workflowId"] as const).filter((key) => typeof step[key] === "string");
    // Missing or multiple targets are reported by validation.
    if (targets.length === 0) {
      return { kind: "none", ...unlinked("", "no-target", "The step has no operationId, operationPath or workflowId.") };
    }
    if (targets.length > 1) {
      return { kind: "none", ...unlinked(String(step[targets[0]]), "multiple-targets", `The step has more than one target: ${targets.join(", ")}.`) };
    }
    const [via] = targets;
    const ref = step[via] as string;
    const link = (value: string): ArazzoStepTarget =>
      via === "operationId"
        ? this.linkOperationId(value)
        : via === "operationPath"
          ? this.linkOperationPath(value)
          : { kind: "workflow", via, ...this.linkWorkflow(value) };
    let target = link(ref);
    const standard = target.status === "unlinked" && (target.reason === "not-found" || target.reason === "invalid-reference")
      ? this.standardReference(via, ref)
      : undefined;
    const retried = standard ? link(standard) : undefined;
    if (standard && retried?.status === "linked") {
      target = { ...retried, ref };
      this.warning(`${ref} isn't standard Arazzo; write it as ${standard}.`, [...path, via]);
    }
    // An unavailable source was already reported once, on the source itself.
    if (target.status === "unlinked" && target.reason !== "source-unavailable") this.error(target.message, [...path, via]);
    return target;
  }

  /** Resolves `{ reference: $components.<type>.<name> }`, or reports why it can't. */
  private component(value: Json, expected: ArazzoComponentOrigin["componentType"], path: string[]): { data: Json; origin: ArazzoComponentOrigin } | null {
    const reference = value.reference;
    const match = typeof reference === "string" ? COMPONENT_REFERENCE.exec(reference) : null;
    if (!match || match[1] !== expected) {
      this.error(`"reference" must look like $components.${expected}.<name>.`, [...path, "reference"]);
      return null;
    }
    const [, componentType, componentName] = match;
    const group = this.document.components?.[componentType];
    const data = isObject(group) ? group[componentName] : undefined;
    if (!isObject(data)) {
      this.error(`There is no component ${reference}.`, [...path, "reference"]);
      return null;
    }
    return { data, origin: { reference: reference as string, componentType: expected, componentName } };
  }

  parameters(values: unknown, path: string[]): ArazzoParameter[] {
    return list(values).flatMap((value, i): ArazzoParameter[] => {
      const itemPath = [...path, String(i)];
      if (!isObject(value)) return [];
      let data = value;
      let component: ArazzoComponentOrigin | undefined;
      if ("reference" in value) {
        const resolved = this.component(value, "parameters", itemPath);
        if (!resolved) return [{ name: "", value: { kind: "literal", raw: undefined }, path: itemPath }];
        // A reusable parameter's `value` overrides the component's.
        data = "value" in value ? { ...resolved.data, value: value.value } : resolved.data;
        component = resolved.origin;
      }
      return [{
        name: typeof data.name === "string" ? data.name : "",
        in: typeof data.in === "string" ? data.in : undefined,
        value: this.reader.value(data.value, [...itemPath, "value"]),
        component,
        path: itemPath,
      }];
    });
  }

  criteria(values: unknown, path: string[]): ArazzoCriterion[] {
    return list(values).flatMap((value, i) => (isObject(value) ? [this.reader.criterion(value, [...path, String(i)])] : []));
  }

  actions(values: unknown, path: string[], kind: "successActions" | "failureActions", stepIds: Set<string>): ArazzoAction[] {
    return list(values).flatMap((value, i): ArazzoAction[] => {
      const itemPath = [...path, String(i)];
      if (!isObject(value)) return [];
      let data = value;
      let component: ArazzoComponentOrigin | undefined;
      if ("reference" in value) {
        const resolved = this.component(value, kind, itemPath);
        if (!resolved) return [{ name: "", type: "", criteria: [], path: itemPath }];
        data = resolved.data;
        component = resolved.origin;
      }
      // Criteria and targets of a component action point into `components`.
      const dataPath = component ? ["components", kind, component.componentName] : itemPath;
      const action: ArazzoAction = {
        name: typeof data.name === "string" ? data.name : "",
        type: typeof data.type === "string" ? data.type : "",
        retryAfter: typeof data.retryAfter === "number" ? data.retryAfter : undefined,
        retryLimit: typeof data.retryLimit === "number" ? data.retryLimit : undefined,
        criteria: this.criteria(data.criteria, [...dataPath, "criteria"]),
        component,
        path: itemPath,
      };
      if (typeof data.stepId === "string") {
        action.stepId = data.stepId;
        action.stepFound = stepIds.has(data.stepId);
        if (!action.stepFound) this.error(`There is no step "${data.stepId}" in this workflow.`, [...itemPath, "stepId"]);
      }
      if (typeof data.workflowId === "string") {
        action.workflow = this.linkWorkflow(data.workflowId);
        if (action.workflow.status === "unlinked" && action.workflow.reason !== "source-unavailable") {
          this.error(action.workflow.message, [...itemPath, "workflowId"]);
        }
      }
      return [action];
    });
  }

  outputs(values: unknown, path: string[]): ArazzoOutput[] {
    if (!isObject(values)) return [];
    return Object.entries(values).map(([name, value]) => ({
      name,
      value: this.reader.requiredExpression(value, [...path, name]),
      path: [...path, name],
    }));
  }

  requestBody(value: unknown, path: string[]): ArazzoRequestBody | undefined {
    if (!isObject(value)) return undefined;
    return {
      contentType: typeof value.contentType === "string" ? value.contentType : undefined,
      payload: "payload" in value ? this.reader.value(value.payload, [...path, "payload"]) : undefined,
      replacements: list(value.replacements).flatMap((item, i) => {
        if (!isObject(item)) return [];
        const itemPath = [...path, "replacements", String(i)];
        return [{ target: String(item.target ?? ""), value: this.reader.value(item.value, [...itemPath, "value"]), path: itemPath }];
      }),
      path,
    };
  }

  step(step: Json, path: string[], workflowParameters: ArazzoParameter[], stepIds: Set<string>): ArazzoStep {
    // Workflow parameters apply to every step; a step's own parameter with the
    // same name and location replaces it.
    const own = this.parameters(step.parameters, [...path, "parameters"]);
    const key = (parameter: ArazzoParameter) => `${parameter.in ?? ""}:${parameter.name}`;
    const ownKeys = new Set(own.map(key));
    return {
      stepId: typeof step.stepId === "string" ? step.stepId : "",
      description: typeof step.description === "string" ? step.description : undefined,
      target: this.stepTarget(step, path),
      parameters: [...workflowParameters.filter((parameter) => !ownKeys.has(key(parameter))), ...own],
      requestBody: this.requestBody(step.requestBody, [...path, "requestBody"]),
      successCriteria: this.criteria(step.successCriteria, [...path, "successCriteria"]),
      onSuccess: this.actions(step.onSuccess, [...path, "onSuccess"], "successActions", stepIds),
      onFailure: this.actions(step.onFailure, [...path, "onFailure"], "failureActions", stepIds),
      outputs: this.outputs(step.outputs, [...path, "outputs"]),
      data: step as ArazzoStep["data"],
      path,
    };
  }

  workflow(workflow: Json, path: string[]): ArazzoWorkflow {
    const steps = list(workflow.steps).filter(isObject);
    const stepIds = new Set(steps.flatMap((step) => (typeof step.stepId === "string" ? [step.stepId] : [])));
    const parameters = this.parameters(workflow.parameters, [...path, "parameters"]);
    const dependsOn = list(workflow.dependsOn).flatMap((ref, i): ArazzoWorkflowLink[] => {
      if (typeof ref !== "string") return [];
      const link = this.linkWorkflow(ref);
      if (link.status === "unlinked" && link.reason !== "source-unavailable") this.error(link.message, [...path, "dependsOn", String(i)]);
      return [link];
    });
    return {
      workflowId: typeof workflow.workflowId === "string" ? workflow.workflowId : "",
      summary: typeof workflow.summary === "string" ? workflow.summary : undefined,
      description: typeof workflow.description === "string" ? workflow.description : undefined,
      inputs: isObject(workflow.inputs) ? (workflow.inputs as ArazzoWorkflow["inputs"]) : undefined,
      dependsOn,
      steps: list(workflow.steps).flatMap((step, i) =>
        isObject(step) ? [this.step(step, [...path, "steps", String(i)], parameters, stepIds)] : [],
      ),
      successActions: this.actions(workflow.successActions, [...path, "successActions"], "successActions", stepIds),
      failureActions: this.actions(workflow.failureActions, [...path, "failureActions"], "failureActions", stepIds),
      outputs: this.outputs(workflow.outputs, [...path, "outputs"]),
      data: workflow as ArazzoWorkflow["data"],
      path,
    };
  }
}

/** Why `document` can't be rendered at all, if it can't. */
function unrenderableReason(document: unknown): string | null {
  if (!isObject(document)) return "Expected an Arazzo document object.";
  if (typeof document.arazzo !== "string") return "Expected an Arazzo document, with a top-level `arazzo` field.";
  if (!SUPPORTED_ARAZZO_VERSION.test(document.arazzo)) {
    return `Arazzo ${document.arazzo} is not supported. Supported versions are 1.0.x and 1.1.x.`;
  }
  return null;
}

/** Builds the model for one document; nested Arazzo sources recurse through here. */
async function buildModel(
  input: Json,
  context: SourceContext,
): Promise<{ model: ArazzoModel | null; diagnostics: ArazzoDiagnostic[] }> {
  const reason = unrenderableReason(input);
  if (reason) return { model: null, diagnostics: [{ message: reason, path: [], severity: 0 }] };

  const validation = validateArazzo(input);
  // Inlines the internal `$ref`s of `inputs` schemas, the only place Arazzo
  // uses `$ref`; reusable objects use `reference` and are resolved below.
  const document = resolveDocument(input) as ArazzoDocumentData;
  const [parsers, sources] = await Promise.all([
    loadExpressionParsers(),
    resolveSources(list(document.sourceDescriptions), context, buildModel),
  ]);

  const builder = new DocumentBuilder(document, sources, parsers);
  const workflows = list(document.workflows).flatMap((workflow, i) =>
    isObject(workflow) ? [builder.workflow(workflow, ["workflows", String(i)])] : [],
  );

  const sourceDiagnostics = sources.flatMap((source): ArazzoDiagnostic[] => [
    ...(source.status === "unresolved" ? [{ message: source.message, path: source.path, severity: 0 as const }] : []),
    ...source.diagnostics,
  ]);

  const model: ArazzoModel = {
    document,
    arazzo: document.arazzo,
    info: isObject(document.info) ? document.info : ({} as ArazzoModel["info"]),
    sources,
    workflows,
    consumers: {},
  };
  const dataFlow = linkDataFlow(model);
  model.consumers = dataFlow.consumers;

  return {
    model,
    diagnostics: [...validation, ...builder.diagnostics, ...dataFlow.diagnostics, ...sourceDiagnostics],
  };
}

function toResult(
  document: ArazzoDocumentData | null,
  model: ArazzoModel | null,
  diagnostics: ArazzoDiagnostic[],
): ArazzoParseResult {
  if (!model) return { status: "unrenderable", diagnostics, document: null, model: null };
  const partial = diagnostics.some((item) => item.severity === 0) || model.sources.some((source) => source.status === "unresolved");
  return { status: partial ? "partial" : "ready", diagnostics, document, model };
}

/** See `resolveArazzoDocument` in ./arazzoModel. */
export async function resolveArazzoDocument(
  document: Record<string, unknown>,
  options: ArazzoResolveOptions = {},
): Promise<ArazzoParseResult> {
  const { model, diagnostics } = await buildModel(document, {
    options,
    loads: new Map(),
    chain: [],
    depth: 0,
    baseUrl: options.baseUrl,
    sourcePrefix: "",
  });
  return toResult(model ? (document as ArazzoDocumentData) : null, model, diagnostics);
}

/** See `parseArazzoDocument` in ./arazzoModel. */
export async function parseArazzoDocument(raw: string, options: ArazzoResolveOptions = {}): Promise<ArazzoParseResult> {
  const text = await readArazzoText(raw);
  if (!text.document) return { status: "unrenderable", diagnostics: text.diagnostics, document: null, model: null };
  const result = await resolveArazzoDocument(text.document, options);
  return { ...result, diagnostics: [...text.diagnostics, ...result.diagnostics] };
}
