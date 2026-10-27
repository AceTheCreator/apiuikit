import type * as ArazzoParserModule from "@usearazzo/parser";
import { SUPPORTED_ARAZZO_VERSION } from "./arazzoValidate";
import type { ArazzoDiagnostic } from "../types/arazzo";

/*
 * The one module that touches `@usearazzo/parser`. It reads Arazzo text into
 * plain JSON; ApiDOM elements never leave this file, so swapping parsers means
 * changing only this file.
 *
 * Like the OpenAPI and AsyncAPI parsers, the package is bundled into its own
 * lazily loaded chunk rather than marked external: a consumer's bundler fails
 * the whole build on a dynamic import it can't resolve, so an external
 * optional peer would break every app that doesn't install it.
 */

async function loadParser(): Promise<typeof ArazzoParserModule> {
  try {
    return await import("@usearazzo/parser");
  } catch (err) {
    console.error("[apiuikit] Failed to load '@usearazzo/parser':", err);
    throw new Error(
      "[apiuikit] Parsing Arazzo text requires '@usearazzo/parser'. " +
        "Install it (`npm i @usearazzo/parser`), or pass the Arazzo document as an object instead.",
    );
  }
}

export interface ArazzoTextResult {
  document: Record<string, unknown> | null;
  diagnostics: ArazzoDiagnostic[];
}

// The top-level spec key of a YAML or JSON document, read without parsing it,
// to explain why the parser rejected it.
const TOP_LEVEL_KEY = /^[\s{]*"?(arazzo|openapi|swagger|asyncapi)"?\s*:\s*["']?([^"'\s,}]*)/m;

/** Why `raw` failed to parse, in words a document author can act on. */
function explainFailure(raw: string): string {
  const match = TOP_LEVEL_KEY.exec(raw);
  if (!match) return "Expected an Arazzo document, with a top-level `arazzo` field.";
  const [, key, version] = match;
  if (key !== "arazzo") {
    const kind = key === "asyncapi" ? "an AsyncAPI" : "an OpenAPI";
    return `This is ${kind} document, not an Arazzo document.`;
  }
  if (!SUPPORTED_ARAZZO_VERSION.test(version)) {
    return `Arazzo ${version || "(no version)"} is not supported. Supported versions are 1.0.x and 1.1.x.`;
  }
  if (raw.trimStart().startsWith("{")) {
    try {
      JSON.parse(raw);
    } catch (err) {
      return `The document is not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return "The document could not be read. Check its YAML or JSON syntax.";
}

/** Reads Arazzo YAML or JSON text into plain JSON. A null document means there is nothing to render. */
export async function readArazzoText(raw: string): Promise<ArazzoTextResult> {
  if (!raw.trim()) {
    return { document: null, diagnostics: [{ message: "The document is empty.", path: [], severity: 0 }] };
  }

  let parseArazzo: typeof ArazzoParserModule.parseArazzo;
  try {
    ({ parseArazzo } = await loadParser());
  } catch (err) {
    return { document: null, diagnostics: [{ message: (err as Error).message, path: [], severity: 0 }] };
  }
  try {
    // No resolvers: content the parser doesn't recognize as Arazzo would
    // otherwise be retried as a file path or URL, and fetched. Sources are
    // resolved by apiuikit, never by the parser.
    const result = await parseArazzo(raw, { resolve: { resolvers: [] } });
    const document = result.api?.toValue();
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return { document: null, diagnostics: [{ message: explainFailure(raw), path: [], severity: 0 }] };
    }
    const annotations = (list: Iterable<{ toValue(): unknown }> | undefined, severity: 0 | 1): ArazzoDiagnostic[] =>
      Array.from(list ?? [], (item) => ({ message: String(item.toValue()), path: [], severity }));
    return {
      document: document as Record<string, unknown>,
      diagnostics: [...annotations(result.errors, 0), ...annotations(result.warnings, 1)],
    };
  } catch {
    return { document: null, diagnostics: [{ message: explainFailure(raw), path: [], severity: 0 }] };
  }
}
