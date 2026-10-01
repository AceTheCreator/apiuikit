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

const toDiagnostic = (error: ScalarErrorLike, severity: 0 | 1): OpenAPIDiagnostic => ({
  message: error.message,
  // The package's own types promise `path?: string[]`, but at least one code
  // path (a missing-required-property error) has been observed returning a
  // plain string instead — normalize defensively rather than trust the type.
  path: Array.isArray(error.path) ? error.path : typeof error.path === "string" ? [error.path] : [],
  severity,
});

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

    const unique = diagnostics.filter((item, index) => diagnostics.findIndex((other) =>
      other.message === item.message && other.severity === item.severity &&
      JSON.stringify(other.path) === JSON.stringify(item.path)) === index);
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
