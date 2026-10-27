import type { ASTNode as RuntimeExpressionNode } from "@swaggerexpert/arazzo-runtime-expression";
import type { ConditionAST } from "@swaggerexpert/arazzo-criterion";
import type { HttpMethod, OpenAPIDocumentData, OpenAPIOperationData, OpenAPIPathItemData } from "./openapi";
import type { SchemaNodeData } from "./schema";

export type { RuntimeExpressionNode, ConditionAST as CriterionConditionNode };

/*
 * ---------------------------------------------------------------------------
 * The Arazzo document as written (plain JSON). Arazzo 1.0.x and 1.1.x share
 * these shapes; fields are optional where the document can omit them, or where
 * a malformed document might, since validation reports rather than rejects.
 * ---------------------------------------------------------------------------
 */

export interface ArazzoInfoData {
  title: string;
  version: string;
  summary?: string;
  description?: string;
  [extension: `x-${string}`]: unknown;
}

/** One entry of `sourceDescriptions`: a document the workflows call into. */
export interface ArazzoSourceDescriptionData {
  name: string;
  url: string;
  /** `openapi` or `arazzo`; Arazzo 1.1 adds `asyncapi`. When omitted, the type is detected from the loaded document. */
  type?: string;
  [extension: `x-${string}`]: unknown;
}

/** `{ reference: "$components.parameters.page", value: 1 }`: a reusable object with an optional value override. */
export interface ArazzoReusableData {
  reference: string;
  value?: unknown;
}

export interface ArazzoParameterData {
  name: string;
  in?: "path" | "query" | "header" | "cookie" | string;
  value: unknown;
}

export interface ArazzoCriterionExpressionTypeData {
  type: "jsonpath" | "xpath" | string;
  version: string;
}

export interface ArazzoCriterionData {
  condition: string;
  context?: string;
  type?: "simple" | "regex" | "jsonpath" | "xpath" | ArazzoCriterionExpressionTypeData | string;
}

export interface ArazzoActionData {
  name: string;
  type: "end" | "goto" | "retry" | string;
  workflowId?: string;
  stepId?: string;
  retryAfter?: number;
  retryLimit?: number;
  criteria?: ArazzoCriterionData[];
}

export interface ArazzoPayloadReplacementData {
  target: string;
  value: unknown;
}

export interface ArazzoRequestBodyData {
  contentType?: string;
  payload?: unknown;
  replacements?: ArazzoPayloadReplacementData[];
}

export interface ArazzoStepData {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: Array<ArazzoParameterData | ArazzoReusableData>;
  requestBody?: ArazzoRequestBodyData;
  successCriteria?: ArazzoCriterionData[];
  onSuccess?: Array<ArazzoActionData | ArazzoReusableData>;
  onFailure?: Array<ArazzoActionData | ArazzoReusableData>;
  outputs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ArazzoWorkflowData {
  workflowId: string;
  summary?: string;
  description?: string;
  /** A JSON Schema describing the workflow's inputs. */
  inputs?: SchemaNodeData;
  dependsOn?: string[];
  steps: ArazzoStepData[];
  successActions?: Array<ArazzoActionData | ArazzoReusableData>;
  failureActions?: Array<ArazzoActionData | ArazzoReusableData>;
  outputs?: Record<string, unknown>;
  parameters?: Array<ArazzoParameterData | ArazzoReusableData>;
  [key: string]: unknown;
}

export interface ArazzoComponentsData {
  inputs?: Record<string, SchemaNodeData>;
  parameters?: Record<string, ArazzoParameterData>;
  successActions?: Record<string, ArazzoActionData>;
  failureActions?: Record<string, ArazzoActionData>;
  [key: string]: unknown;
}

/** An Arazzo document as plain JSON, the input of `resolveArazzoDocument`. */
export interface ArazzoDocumentData extends Record<string, unknown> {
  arazzo: string;
  info: ArazzoInfoData;
  sourceDescriptions: ArazzoSourceDescriptionData[];
  workflows: ArazzoWorkflowData[];
  components?: ArazzoComponentsData;
}

/*
 * ---------------------------------------------------------------------------
 * Diagnostics and options
 * ---------------------------------------------------------------------------
 */

/**
 * The diagnostics shape shared with the OpenAPI and AsyncAPI parsers, plus an
 * optional `source`: the `name` of the source description the diagnostic is
 * about (nested Arazzo sources are joined with `/`, e.g. `"flows/petstore"`).
 * Without `source`, `path` points into the Arazzo document itself; with it,
 * into that source's document.
 */
export interface ArazzoDiagnostic {
  message: string;
  path: string[];
  /** 0 is an error, 1 a warning. */
  severity: 0 | 1;
  source?: string;
}

/**
 * A source document supplied by the caller: a parsed object, or the raw
 * YAML/JSON text. Raw OpenAPI text needs `@scalar/openapi-parser` installed;
 * raw Arazzo text needs `@usearazzo/parser`.
 */
export type ArazzoSourceInput = string | Record<string, unknown>;

/**
 * How to obtain the documents behind `sourceDescriptions`. Each source is
 * looked up in this order:
 *
 * 1. `sources[name]`, matched by the source description's `name` (entry document only);
 * 2. its `url`, loaded by `loadSource` when given, otherwise fetched: absolute
 *    URLs as they are, relative ones only when `baseUrl` is set;
 * 3. otherwise the source is left unresolved, with a reason.
 */
export interface ArazzoResolveOptions {
  /** Source documents keyed by `sourceDescriptions[].name`. */
  sources?: Record<string, ArazzoSourceInput>;
  /** Where the Arazzo document lives. Relative source `url`s are resolved against it, and only then fetched. */
  baseUrl?: string;
  /**
   * Loads a source yourself, for example to add auth headers or read from a
   * virtual file system. Called with the `url` (resolved against `baseUrl` or
   * the parent document's URL when one is known, otherwise as written) and the
   * source description. Return the document, or `undefined` if you don't have
   * it. Replaces the built-in fetch.
   */
  loadSource?: (url: string, sourceDescription: ArazzoSourceDescriptionData) => Promise<ArazzoSourceInput | undefined> | ArazzoSourceInput | undefined;
  /** How deep `type: arazzo` sources may nest. Defaults to 3. */
  maxDepth?: number;
}

/*
 * ---------------------------------------------------------------------------
 * The resolved model
 *
 * One normalized tree that follows the document's own structure (workflows →
 * steps → parameters, criteria, actions, outputs), with every reference
 * resolved in place: components inlined, sources loaded, step targets linked,
 * and every value that may hold a runtime expression parsed. Each node keeps
 * its `path` in the Arazzo document, which is what diagnostics, deep links and
 * "who uses this value" lookups key on.
 * ---------------------------------------------------------------------------
 */

/** A runtime expression such as `$steps.login.outputs.token`, with its original text. */
export interface ArazzoExpression {
  /** The expression exactly as written, without surrounding braces. */
  text: string;
  /** The parsed form, or null when the text is not a valid runtime expression. */
  node: RuntimeExpressionNode | null;
  /** What the expression reads, worked out once the whole document is built. Absent when it doesn't parse. */
  target?: ArazzoExpressionTarget;
}

/**
 * What a runtime expression reads:
 * - `input`, `step-output`, `workflow-output`: a value a workflow or step produces;
 * - `step`: a step itself (`$workflows.<id>.steps.<id>`);
 * - `source`, `component`: a source description, or a reusable object;
 * - `request`, `response`, `message`, `status-code`, `url`, `method`: the
 *   current step's own exchange; `self`: this document's URI.
 */
export interface ArazzoExpressionTarget {
  kind:
    | "input"
    | "step-output"
    | "workflow-output"
    | "step"
    | "source"
    | "component"
    | "request"
    | "response"
    | "message"
    | "status-code"
    | "url"
    | "method"
    | "self";
  /** What the expression points at, in words: `Output "token" of step login`. */
  description: string;
  /**
   * Names the value read, the same for every expression that reads it; the
   * key of `ArazzoModel.consumers`. Set for inputs, step outputs and workflow
   * outputs in this document.
   */
  valueKey?: string;
  /** The workflow or step key (see `stepKey`) that defines the value, when it's in this document. */
  linkKey?: string;
  /** For `source`: the source description's name. */
  sourceName?: string;
  /** Why the reference is broken: the step, output, input, workflow, source or component doesn't exist. */
  problem?: string;
}

/** Where a value is read: one expression in one place in the document. */
export interface ArazzoValueUse {
  workflowId: string;
  /** Absent when the workflow itself reads the value (its outputs or workflow-level actions). */
  stepId?: string;
  /** The field the expression is written in, e.g. `parameters`, `requestBody`, `successCriteria`, `outputs`. */
  field: string;
  expression: ArazzoExpression;
  /** The node holding the expression: the parameter, criterion, output or request body. */
  path: string[];
}

/**
 * A value that may contain runtime expressions:
 * - `literal`: no expressions (`"available"`, `10`);
 * - `expression`: the whole value is one expression (`$inputs.petId`);
 * - `template`: a string embedding expressions in braces (`"Bearer {$steps.login.outputs.token}"`),
 *   split into literal text and expressions in order;
 * - `structure`: an object or array (a request payload) with expressions somewhere inside,
 *   each listed with its JSON Pointer within `raw`.
 */
export type ArazzoValue =
  | { kind: "literal"; raw: unknown }
  | { kind: "expression"; raw: string; expression: ArazzoExpression }
  | { kind: "template"; raw: string; parts: Array<string | ArazzoExpression> }
  | { kind: "structure"; raw: unknown; expressions: Array<{ pointer: string; value: ArazzoTextValue }> };

/** The string-valued kinds of `ArazzoValue`. */
export type ArazzoTextValue = Extract<ArazzoValue, { kind: "expression" | "template" }>;

/** Where a node came from when it was written as `{ reference: "$components.<type>.<name>" }`. */
export interface ArazzoComponentOrigin {
  /** The reference as written, e.g. `$components.parameters.page`. */
  reference: string;
  componentType: "parameters" | "successActions" | "failureActions";
  componentName: string;
}

export interface ArazzoParameter {
  /** Empty when the parameter is an unresolvable reference. */
  name: string;
  in?: string;
  value: ArazzoValue;
  /** Set when the parameter came from `$components.parameters`. */
  component?: ArazzoComponentOrigin;
  path: string[];
}

export interface ArazzoCriterion {
  /** `simple` when the document omits it. */
  type: "simple" | "regex" | "jsonpath" | "xpath" | string;
  /** The expression-language version, for `{ type, version }` criterion types. */
  version?: string;
  condition: string;
  context?: ArazzoValue;
  /** The parsed condition, for `simple` criteria only; null when the condition is not valid syntax. */
  conditionNode?: ConditionAST | null;
  /** Every runtime expression the criterion reads, from its context and (simple) condition. */
  expressions: ArazzoExpression[];
  path: string[];
}

/** Where a `workflowId` points: this document, or an Arazzo source. */
export type ArazzoWorkflowLink =
  | {
      status: "linked";
      /** The reference as written. */
      ref: string;
      workflowId: string;
      /** The Arazzo source the workflow lives in; absent for a workflow in this document. */
      sourceName?: string;
    }
  | ArazzoUnlinked;

export interface ArazzoUnlinked {
  status: "unlinked";
  ref: string;
  sourceName?: string;
  reason: ArazzoUnlinkedReason;
  message: string;
}

export type ArazzoUnlinkedReason =
  /** The step names no target, or more than one. */
  | "no-target"
  | "multiple-targets"
  /** The source the target lives in could not be loaded; see that source's `reason`. */
  | "source-unavailable"
  /** `$sourceDescriptions.<name>` names no source description. */
  | "unknown-source"
  /** The source exists but is not of the type the target needs (e.g. an operation in an Arazzo source). */
  | "wrong-source-type"
  /** A bare `operationId` matched operations in more than one source. */
  | "ambiguous"
  | "not-found"
  /** An `operationPath` that resolves, but not to an operation. */
  | "not-an-operation"
  /** An `operationPath` that is not `{$sourceDescriptions.<name>.url}#<json-pointer>`. */
  | "invalid-reference";

/** What a step calls. */
export type ArazzoStepTarget =
  | {
      kind: "operation";
      status: "linked";
      via: "operationId" | "operationPath";
      ref: string;
      sourceName: string;
      method: HttpMethod;
      /** The path template, or the webhook name when `isWebhook`. */
      path: string;
      isWebhook: boolean;
      operation: OpenAPIOperationData;
      pathItem: OpenAPIPathItemData;
    }
  | ({ kind: "workflow"; via: "workflowId" } & Extract<ArazzoWorkflowLink, { status: "linked" }>)
  | ({ kind: "operation" | "workflow" | "none"; via?: "operationId" | "operationPath" | "workflowId" } & ArazzoUnlinked);

export interface ArazzoAction {
  /** Empty when the action is an unresolvable reference. */
  name: string;
  type: "end" | "goto" | "retry" | string;
  /** For `goto`/`retry` naming a step: whether that step exists in the same workflow. */
  stepId?: string;
  stepFound?: boolean;
  /** For `goto`/`retry` naming a workflow. */
  workflow?: ArazzoWorkflowLink;
  retryAfter?: number;
  retryLimit?: number;
  criteria: ArazzoCriterion[];
  /** Set when the action came from `$components.successActions` / `failureActions`. */
  component?: ArazzoComponentOrigin;
  path: string[];
}

export interface ArazzoOutput {
  name: string;
  value: ArazzoValue;
  path: string[];
}

export interface ArazzoRequestBody {
  contentType?: string;
  payload?: ArazzoValue;
  replacements: Array<{ target: string; value: ArazzoValue; path: string[] }>;
  path: string[];
}

export interface ArazzoStep {
  stepId: string;
  description?: string;
  target: ArazzoStepTarget;
  /** The workflow's own `parameters` come first, then the step's; a step parameter overrides a workflow one with the same name and location. */
  parameters: ArazzoParameter[];
  requestBody?: ArazzoRequestBody;
  successCriteria: ArazzoCriterion[];
  onSuccess: ArazzoAction[];
  onFailure: ArazzoAction[];
  outputs: ArazzoOutput[];
  /** The step as written. */
  data: ArazzoStepData;
  path: string[];
}

export interface ArazzoWorkflow {
  workflowId: string;
  summary?: string;
  description?: string;
  /** The inputs JSON Schema, with internal `$ref`s inlined so the schema components render it. */
  inputs?: SchemaNodeData;
  dependsOn: ArazzoWorkflowLink[];
  steps: ArazzoStep[];
  successActions: ArazzoAction[];
  failureActions: ArazzoAction[];
  outputs: ArazzoOutput[];
  /** The workflow as written. */
  data: ArazzoWorkflowData;
  path: string[];
}

/** Why a source could not be resolved. */
export type ArazzoSourceUnresolvedReason =
  /** No `sources` entry, and nothing to load it from (no `url`, or a relative `url` without `baseUrl` or `loadSource`). */
  | "not-provided"
  /** `loadSource` returned nothing. */
  | "not-found"
  /** The request failed: network error, CORS, or a non-2xx response. */
  | "fetch-failed"
  /** The document was obtained but could not be parsed, or isn't a supported document. */
  | "parse-failed"
  /** The document is of a different type than the source description declares. */
  | "type-mismatch"
  /** A type apiuikit can't render yet, such as `asyncapi`. */
  | "unsupported-type"
  /** An Arazzo source that (directly or indirectly) includes itself. */
  | "cycle"
  /** Arazzo sources nested deeper than `maxDepth`. */
  | "max-depth";

interface ArazzoSourceBase {
  name: string;
  /** The source description as written. */
  description: ArazzoSourceDescriptionData;
  /** The `url` the document was (or would have been) loaded from, resolved when possible. */
  url?: string;
  /** Diagnostics about this source's document. Also included, with `source` set, in the result's diagnostics. */
  diagnostics: ArazzoDiagnostic[];
  path: string[];
}

export type ArazzoSource =
  | (ArazzoSourceBase & {
      status: "resolved";
      type: "openapi";
      /** How the document was obtained. */
      origin: "sources" | "loadSource" | "fetch";
      document: OpenAPIDocumentData;
    })
  | (ArazzoSourceBase & {
      status: "resolved";
      type: "arazzo";
      origin: "sources" | "loadSource" | "fetch";
      document: ArazzoDocumentData;
      /** The nested document, resolved with the same options. */
      model: ArazzoModel;
    })
  | (ArazzoSourceBase & {
      status: "unresolved";
      type?: string;
      reason: ArazzoSourceUnresolvedReason;
      message: string;
    });

export interface ArazzoModel {
  /** The document as given, with `inputs` `$ref`s inlined. */
  document: ArazzoDocumentData;
  arazzo: string;
  info: ArazzoInfoData;
  /** In document order. */
  sources: ArazzoSource[];
  /** In document order. */
  workflows: ArazzoWorkflow[];
  /** Every place each value is read, keyed by `ArazzoExpressionTarget.valueKey`, in document order. */
  consumers: Record<string, ArazzoValueUse[]>;
}

/**
 * What `parseArazzoDocument` and `resolveArazzoDocument` return. `status`
 * follows the OpenAPI and AsyncAPI parsers: `ready` with no errors, `partial`
 * when something is wrong but the document still renders (an invalid field, a
 * source that can't be loaded, a step that can't be linked), `unrenderable`
 * when there is no Arazzo document to show.
 */
export interface ArazzoParseResult {
  status: "ready" | "partial" | "unrenderable";
  diagnostics: ArazzoDiagnostic[];
  document: ArazzoDocumentData | null;
  model: ArazzoModel | null;
}
