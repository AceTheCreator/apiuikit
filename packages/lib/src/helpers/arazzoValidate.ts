import type { ArazzoDiagnostic } from "../types/arazzo";

/*
 * Structural validation of an Arazzo document: the fixed fields, their types
 * and allowed values, and the uniqueness rules a renderer relies on.
 * `@usearazzo/parser` reads documents without validating them, and its
 * companion validator brings a full language service with it, too heavy to
 * load in a browser. This covers what a reader of the rendered page would
 * notice; reference checks (components, step targets, goto steps, runtime
 * expressions) happen while the model is built.
 */

export const SUPPORTED_ARAZZO_VERSION = /^1\.[01]\.\d+$/;
const NAME = /^[A-Za-z0-9_-]+$/;
const OUTPUT_NAME = /^[a-zA-Z0-9.\-_]+$/;
const PARAMETER_IN = ["path", "query", "header", "cookie"];
const CRITERION_TYPES = ["simple", "regex", "jsonpath", "xpath"];

type Path = string[];
type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describe = (value: unknown) =>
  value === null ? "null" : Array.isArray(value) ? "an array" : `a ${typeof value}`;

const isReusable = (value: unknown): value is { reference: unknown } => isObject(value) && "reference" in value;

/** Validates `document`; returns diagnostics with paths into it. */
export function validateArazzo(document: Json): ArazzoDiagnostic[] {
  const diagnostics: ArazzoDiagnostic[] = [];
  const error = (message: string, path: Path) => diagnostics.push({ message, path, severity: 0 });
  const warn = (message: string, path: Path) => diagnostics.push({ message, path, severity: 1 });

  /** Checks `parent[key]` is a string; reports it when required and missing. */
  const string = (parent: Json, key: string, path: Path, required: boolean): string | undefined => {
    const value = parent[key];
    if (value === undefined) {
      if (required) error(`Missing required field "${key}".`, path);
      return undefined;
    }
    if (typeof value !== "string") {
      error(`"${key}" must be a string, not ${describe(value)}.`, [...path, key]);
      return undefined;
    }
    return value;
  };

  /** Checks `parent[key]` is an array, returning its items (empty when missing or wrong). */
  const array = (parent: Json, key: string, path: Path, required: boolean, nonEmpty = false): unknown[] => {
    const value = parent[key];
    if (value === undefined) {
      if (required) error(`Missing required field "${key}".`, path);
      return [];
    }
    if (!Array.isArray(value)) {
      error(`"${key}" must be an array, not ${describe(value)}.`, [...path, key]);
      return [];
    }
    if (nonEmpty && value.length === 0) error(`"${key}" must have at least one entry.`, [...path, key]);
    return value;
  };

  const object = (value: unknown, what: string, path: Path): value is Json => {
    if (isObject(value)) return true;
    error(`${what} must be an object, not ${describe(value)}.`, path);
    return false;
  };

  const unique = (ids: Array<[string | undefined, Path]>, what: string) => {
    const seen = new Set<string>();
    for (const [id, path] of ids) {
      if (id === undefined) continue;
      if (seen.has(id)) error(`Duplicate ${what} "${id}".`, path);
      seen.add(id);
    }
  };

  const outputs = (parent: Json, path: Path) => {
    const value = parent.outputs;
    if (value === undefined) return;
    if (!object(value, '"outputs"', [...path, "outputs"])) return;
    for (const [name, expression] of Object.entries(value)) {
      if (!OUTPUT_NAME.test(name)) error(`Output name "${name}" may only contain letters, digits, ".", "-" and "_".`, [...path, "outputs", name]);
      if (typeof expression !== "string") error(`Output "${name}" must be a runtime expression string.`, [...path, "outputs", name]);
    }
  };

  const criterion = (value: unknown, path: Path) => {
    if (!object(value, "A criterion", path)) return;
    string(value, "condition", path, true);
    string(value, "context", path, false);
    const type = value.type;
    if (type === undefined) return;
    if (isObject(type)) {
      string(type, "version", [...path, "type"], true);
      if (type.type !== "jsonpath" && type.type !== "xpath") {
        error(`A criterion expression type must be "jsonpath" or "xpath".`, [...path, "type", "type"]);
      }
    } else if (typeof type !== "string" || !CRITERION_TYPES.includes(type)) {
      error(`Criterion type must be one of ${CRITERION_TYPES.join(", ")}.`, [...path, "type"]);
      return;
    }
    if (type !== "simple" && value.context === undefined) {
      error(`A ${isObject(type) ? String(type.type) : type} criterion needs a "context".`, path);
    }
  };

  const criteria = (parent: Json, key: string, path: Path) =>
    array(parent, key, path, false).forEach((item, i) => criterion(item, [...path, key, String(i)]));

  const action = (value: unknown, path: Path, kind: "success" | "failure") => {
    if (isReusable(value)) return;
    if (!object(value, "An action", path)) return;
    string(value, "name", path, true);
    const type = string(value, "type", path, true);
    const allowed = kind === "success" ? ["end", "goto"] : ["end", "goto", "retry"];
    if (type !== undefined && !allowed.includes(type)) {
      error(`A ${kind} action's type must be one of ${allowed.join(", ")}.`, [...path, "type"]);
    }
    const stepId = string(value, "stepId", path, false);
    const workflowId = string(value, "workflowId", path, false);
    if (stepId !== undefined && workflowId !== undefined) {
      error(`An action can name a "stepId" or a "workflowId", not both.`, path);
    }
    if (type === "goto" && stepId === undefined && workflowId === undefined) {
      error(`A goto action needs a "stepId" or a "workflowId".`, path);
    }
    if (type === "retry") {
      const { retryAfter, retryLimit } = value;
      if (retryAfter !== undefined && (typeof retryAfter !== "number" || retryAfter < 0)) {
        error(`"retryAfter" must be a non-negative number of seconds.`, [...path, "retryAfter"]);
      }
      if (retryLimit !== undefined && (!Number.isInteger(retryLimit) || (retryLimit as number) < 0)) {
        error(`"retryLimit" must be a non-negative integer.`, [...path, "retryLimit"]);
      }
    }
    criteria(value, "criteria", path);
  };

  const actions = (parent: Json, key: string, path: Path, kind: "success" | "failure") =>
    array(parent, key, path, false).forEach((item, i) => action(item, [...path, key, String(i)], kind));

  const parameters = (parent: Json, path: Path, needsIn: boolean) =>
    array(parent, "parameters", path, false).forEach((item, i) => {
      const itemPath = [...path, "parameters", String(i)];
      if (isReusable(item)) return;
      if (!object(item, "A parameter", itemPath)) return;
      string(item, "name", itemPath, true);
      if (!("value" in item)) error(`Missing required field "value".`, itemPath);
      const location = string(item, "in", itemPath, false);
      if (location === undefined && needsIn && item.in === undefined) {
        error(`A parameter of an operation step needs "in" (${PARAMETER_IN.join(", ")}).`, itemPath);
      }
      if (location !== undefined && !PARAMETER_IN.includes(location)) {
        error(`"in" must be one of ${PARAMETER_IN.join(", ")}.`, [...itemPath, "in"]);
      }
    });

  const step = (value: unknown, path: Path): string | undefined => {
    if (!object(value, "A step", path)) return undefined;
    const stepId = string(value, "stepId", path, true);
    if (stepId !== undefined && !NAME.test(stepId)) {
      warn(`Step IDs should only contain letters, digits, "-" and "_", so runtime expressions can refer to them.`, [...path, "stepId"]);
    }
    const targets = ["operationId", "operationPath", "workflowId"].filter((key) => value[key] !== undefined);
    targets.forEach((key) => string(value, key, path, false));
    if (targets.length === 0) error(`A step needs one of "operationId", "operationPath" or "workflowId".`, path);
    if (targets.length > 1) error(`A step can have only one of ${targets.map((key) => `"${key}"`).join(", ")}.`, path);
    parameters(value, path, targets.length === 1 && targets[0] !== "workflowId");
    if (value.requestBody !== undefined && object(value.requestBody, '"requestBody"', [...path, "requestBody"])) {
      const body = value.requestBody;
      const bodyPath = [...path, "requestBody"];
      string(body, "contentType", bodyPath, false);
      array(body, "replacements", bodyPath, false).forEach((item, i) => {
        const itemPath = [...bodyPath, "replacements", String(i)];
        if (!object(item, "A payload replacement", itemPath)) return;
        string(item, "target", itemPath, true);
        if (!("value" in item)) error(`Missing required field "value".`, itemPath);
      });
    }
    criteria(value, "successCriteria", path);
    actions(value, "onSuccess", path, "success");
    actions(value, "onFailure", path, "failure");
    outputs(value, path);
    return stepId;
  };

  const workflow = (value: unknown, path: Path): string | undefined => {
    if (!object(value, "A workflow", path)) return undefined;
    const workflowId = string(value, "workflowId", path, true);
    if (workflowId !== undefined && !NAME.test(workflowId)) {
      warn(`Workflow IDs should only contain letters, digits, "-" and "_", so runtime expressions can refer to them.`, [...path, "workflowId"]);
    }
    string(value, "summary", path, false);
    string(value, "description", path, false);
    if (value.inputs !== undefined) object(value.inputs, '"inputs"', [...path, "inputs"]);
    array(value, "dependsOn", path, false).forEach((item, i) => {
      if (typeof item !== "string") error(`"dependsOn" entries must be workflow IDs.`, [...path, "dependsOn", String(i)]);
    });
    const steps = array(value, "steps", path, true, true);
    unique(steps.map((item, i) => [step(item, [...path, "steps", String(i)]), [...path, "steps", String(i), "stepId"]]), "stepId");
    actions(value, "successActions", path, "success");
    actions(value, "failureActions", path, "failure");
    outputs(value, path);
    parameters(value, path, false);
    return workflowId;
  };

  string(document, "arazzo", [], true);
  if (object(document.info, '"info"', ["info"])) {
    string(document.info, "title", ["info"], true);
    string(document.info, "version", ["info"], true);
    string(document.info, "summary", ["info"], false);
    string(document.info, "description", ["info"], false);
  }

  const version = typeof document.arazzo === "string" ? document.arazzo : "";
  const sourceTypes = version.startsWith("1.0.") ? ["openapi", "arazzo"] : ["openapi", "arazzo", "asyncapi"];
  const sources = array(document, "sourceDescriptions", [], true, true);
  unique(
    sources.map((item, i) => {
      const path = ["sourceDescriptions", String(i)];
      if (!object(item, "A source description", path)) return [undefined, path];
      const name = string(item, "name", path, true);
      if (name !== undefined && !NAME.test(name)) {
        error(`Source names may only contain letters, digits, "-" and "_".`, [...path, "name"]);
      }
      string(item, "url", path, true);
      const type = string(item, "type", path, false);
      if (type !== undefined && !sourceTypes.includes(type)) {
        error(`Source type must be one of ${sourceTypes.join(", ")} in Arazzo ${version}.`, [...path, "type"]);
      }
      return [name, [...path, "name"]];
    }),
    "source description name",
  );

  const workflows = array(document, "workflows", [], true, true);
  unique(workflows.map((item, i) => [workflow(item, ["workflows", String(i)]), ["workflows", String(i), "workflowId"]]), "workflowId");

  if (document.components !== undefined && object(document.components, '"components"', ["components"])) {
    for (const key of ["inputs", "parameters", "successActions", "failureActions"]) {
      const group = document.components[key];
      if (group === undefined || !object(group, `"components.${key}"`, ["components", key])) continue;
      for (const [name, item] of Object.entries(group)) {
        const path = ["components", key, name];
        if (!NAME.test(name)) error(`Component names may only contain letters, digits, "-" and "_".`, path);
        if (key === "parameters" && object(item, "A parameter", path)) {
          string(item, "name", path, true);
          if (!("value" in item)) error(`Missing required field "value".`, path);
        }
        if (key === "successActions" || key === "failureActions") action(item, path, key === "successActions" ? "success" : "failure");
      }
    }
  }

  return diagnostics;
}
