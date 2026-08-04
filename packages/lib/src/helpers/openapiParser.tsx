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

interface OpenAPIDiagnostic {
  message: string;
  path: string[];
  severity: 0 | 1;
}

interface ScalarErrorLike {
  message: string;
  path?: string[];
}

const toDiagnostic = (error: ScalarErrorLike, severity: 0 | 1): OpenAPIDiagnostic => ({
  message: error.message,
  // The package's own types promise `path?: string[]`, but at least one code
  // path (a missing-required-property error) has been observed returning a
  // plain string instead — normalize defensively rather than trust the type.
  path: Array.isArray(error.path) ? error.path : [],
  severity,
});

export async function parseDocument(raw: string): Promise<{
  diagnostics: unknown[];
  document: OpenAPIDocumentData | null;
}> {
  try {
    const { validate, dereference } = await loadParser();
    const result = await validate(raw);

    if (!result.valid) {
      return {
        diagnostics: result.errors.map((error) => toDiagnostic(error, 0)),
        document: null,
      };
    }

    const diagnostics = (result.errors ?? []).map((error) => toDiagnostic(error, 1));
    // Dereference `raw` again rather than reusing `result.schema`: validate()'s
    // own AJV pass already resolves $refs for validation purposes, so for a
    // recursive schema `result.schema` comes back containing real circular
    // object references (not $ref strings). Feeding that into dereference()
    // makes its unguarded internal reference-collection walk (getListOfReferences
    // via traverse()) recurse forever over the cycle. Re-parsing from `raw`
    // gives dereference() a fresh, still-$ref-string document, which its own
    // (cycle-safe) resolver can dereference correctly.
    const { schema, errors: derefErrors } = dereference(raw);
    if (derefErrors?.length) {
      diagnostics.push(...derefErrors.map((error) => toDiagnostic(error, 0)));
    }

    return { diagnostics, document: (schema as OpenAPIDocumentData | undefined) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse document";
    return { diagnostics: [{ message, path: [], severity: 0 }], document: null };
  }
}

export async function parseAndRender(raw: string, config?: ConfigInterface) {
  const { diagnostics, document } = await parseDocument(raw);

  return {
    diagnostics,
    view: document ? <OpenAPI kind="resolved" openapi={document} config={config} /> : null,
  };
}
