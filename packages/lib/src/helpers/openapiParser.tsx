import OpenAPI from "../containers/OpenAPI/OpenAPI";
import { OpenAPIDocumentData } from "../types/openapi";
import type { ConfigInterface } from "../config/config";
import type * as OpenAPIParserModule from "@scalar/openapi-parser";

async function loadParser(): Promise<typeof OpenAPIParserModule> {
  try {
    return await import("@scalar/openapi-parser");
  } catch (err) {
    console.error("[apiuikit] Failed to load '@scalar/openapi-parser':", err);
    throw new Error(
      "[apiuikit] The parsed entry requires '@scalar/openapi-parser'. " +
        "Install it (`npm i @scalar/openapi-parser`), or use the `OpenAPI` component with a pre-resolved document instead.",
    );
  }
}

export interface OpenAPIDiagnostic {
  message: string;
  path: string[];
  severity: 0 | 1;
}

interface ScalarErrorLike {
  message: string;
  path?: string[] | string;
}

// The package's own types promise `path?: string[]`, but validation errors
// come back with a JSON pointer string instead ("/paths/~1pets/get") —
// split it into segments so diagnostics share AsyncAPI's path shape.
const toPath = (path: ScalarErrorLike["path"]): string[] => {
  if (Array.isArray(path)) return path;
  if (typeof path !== "string" || path === "") return [];
  if (!path.startsWith("/")) return [path];
  return path.slice(1).split("/").map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
};

const toDiagnostic = (error: ScalarErrorLike, severity: 0 | 1): OpenAPIDiagnostic => ({
  message: error.message,
  path: toPath(error.path),
  severity,
});

// The OpenAPI schema models most objects as `oneOf: [Thing, Reference]`, so
// AJV reports one real defect plus "must have required property '$ref'" and
// "must match exactly one schema in oneOf" at every ancestor. Those are only
// noise once a more specific error sits at or beneath the same node.
const ALTERNATIVE_MISMATCH = new Set([
  "must have required property '$ref'",
  "must match exactly one schema in oneOf",
]);

const isWithin = (path: string[], ancestor: string[]) =>
  path.length >= ancestor.length && ancestor.every((segment, index) => path[index] === segment);

function cleanDiagnostics(diagnostics: OpenAPIDiagnostic[]): OpenAPIDiagnostic[] {
  const seen = new Set<string>();
  const unique = diagnostics.filter((item) => {
    const key = JSON.stringify([item.severity, item.message, item.path]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const specific = unique.filter((item) => !ALTERNATIVE_MISMATCH.has(item.message));
  return unique.filter((item) =>
    !ALTERNATIVE_MISMATCH.has(item.message) ||
    !specific.some((other) => isWithin(other.path, item.path)));
}

export interface OpenAPIParseResult {
  status: "ready" | "partial" | "unrenderable";
  diagnostics: OpenAPIDiagnostic[];
  document: OpenAPIDocumentData | null;
}

export async function parseDocument(raw: string): Promise<OpenAPIParseResult> {
  const diagnostics: OpenAPIDiagnostic[] = [];
  try {
    const { validate, dereference, normalize } = await loadParser();
    let schema = normalize(raw);
    if (!schema || typeof schema !== "object" || Array.isArray(schema) ||
        typeof schema.openapi !== "string" || !/^3\.(0|1)\.\d+$/.test(schema.openapi)) {
      diagnostics.push({ message: "Expected an OpenAPI 3.0 or 3.1 document.", path: [], severity: 0 });
      return { status: "unrenderable", diagnostics, document: null };
    }

    // Scalar defaults a missing/non-string info.version during validation.
    // Report the original defect without inventing a version for the renderer.
    const info = schema.info;
    if (info && typeof info === "object" && !Array.isArray(info) &&
        typeof (info as Record<string, unknown>).version !== "string") {
      diagnostics.push({ message: "info.version must be a string.", path: ["info", "version"], severity: 0 });
    }

    // Work from raw text, never validation's schema: AJV may introduce cycles.
    // Keep the decoded document if reference resolution itself throws.
    try {
      const resolved = dereference(raw);
      diagnostics.push(...(resolved.errors ?? []).map((error) => toDiagnostic(error, 0)));
      if (resolved.schema && !resolved.errors?.length) schema = resolved.schema;
    } catch (err) {
      diagnostics.push({ message: err instanceof Error ? err.message : "Reference resolution failed", path: [], severity: 0 });
    }

    // Validation informs the user; it does not decide whether content exists.
    try {
      const result = await validate(raw);
      diagnostics.push(...(result.errors ?? []).map((error) => toDiagnostic(error, result.valid ? 1 : 0)));
    } catch (err) {
      diagnostics.push({ message: err instanceof Error ? err.message : "Validation failed", path: [], severity: 0 });
    }

    const unique = cleanDiagnostics(diagnostics);
    return {
      status: unique.some((item) => item.severity === 0) ? "partial" : "ready",
      diagnostics: unique,
      document: schema as OpenAPIDocumentData,
    };
  } catch (err) {
    diagnostics.push({ message: err instanceof Error ? err.message : "Failed to parse document", path: [], severity: 0 });
    return { status: "unrenderable", diagnostics, document: null };
  }
}

export async function parseAndRender(raw: string, config?: ConfigInterface) {
  const { diagnostics, document } = await parseDocument(raw);

  return {
    diagnostics,
    view: document ? <OpenAPI openapi={document} config={config} /> : null,
  };
}
