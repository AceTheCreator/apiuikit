import { readArazzoText } from "./arazzoDocumentParser";
import { parseDocument } from "./openapiDocumentParser";
import { resolveDocument } from "./resolveDocument";
import type {
  ArazzoDiagnostic,
  ArazzoDocumentData,
  ArazzoModel,
  ArazzoResolveOptions,
  ArazzoSource,
  ArazzoSourceDescriptionData,
  ArazzoSourceInput,
  ArazzoSourceUnresolvedReason,
} from "../types/arazzo";
import type { OpenAPIDocumentData } from "../types/openapi";

/*
 * Finding and parsing the documents behind `sourceDescriptions`. Never
 * throws: every way a source can go wrong ends as an unresolved source with a
 * reason, so one missing file never takes down the page.
 */

export const DEFAULT_MAX_DEPTH = 3;

/** State shared by one resolution, across nested Arazzo sources. */
export interface SourceContext {
  options: ArazzoResolveOptions;
  /** Loads by URL, so a document referenced from several places loads once. */
  loads: Map<string, Promise<Loaded>>;
  /** URLs of the Arazzo documents above this one, to catch cycles. */
  chain: string[];
  depth: number;
  /** Base for this document's relative source URLs. */
  baseUrl?: string;
  /** `/`-joined names of the sources leading here, for diagnostics; empty for the entry document. */
  sourcePrefix: string;
}

/** Builds the model of a nested Arazzo source. Passed in to keep the two modules acyclic. */
export type BuildNested = (
  document: Record<string, unknown>,
  context: SourceContext,
) => Promise<{ model: ArazzoModel | null; diagnostics: ArazzoDiagnostic[] }>;

type Origin = "sources" | "loadSource" | "fetch";
type Loaded = { input: ArazzoSourceInput } | { reason: ArazzoSourceUnresolvedReason; message: string };

const SUPPORTED_TYPES = ["openapi", "arazzo"];
const OPENAPI_3 = /^3\.[01]\.\d+$/;

const isAbsolute = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/** `url` resolved against `base` when both allow it, otherwise unchanged. */
export function resolveUrl(url: string, base: string | undefined): string {
  if (isAbsolute(url)) return url;
  if (!base) return url;
  try {
    const absoluteBase = isAbsolute(base) ? base : new URL(base, globalThis.location?.href).href;
    return new URL(url, absoluteBase).href;
  } catch {
    return url;
  }
}

const TOP_LEVEL_KEY = /^[\s{]*"?(arazzo|openapi|swagger|asyncapi)"?\s*:/m;

/** Which kind of document `input` is, read from its top-level spec key. */
function detectType(input: ArazzoSourceInput): string | undefined {
  if (typeof input === "string") return TOP_LEVEL_KEY.exec(input)?.[1];
  return ["arazzo", "openapi", "swagger", "asyncapi"].find((key) => key in input);
}

async function fetchText(url: string): Promise<Loaded> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { reason: "fetch-failed", message: `Fetching ${url} failed with HTTP ${response.status}.` };
    }
    return { input: await response.text() };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      reason: "fetch-failed",
      message: `Could not fetch ${url} (${detail}). The server may not allow cross-origin requests; pass the document in \`sources\` or load it with \`loadSource\`.`,
    };
  }
}

async function callLoadSource(
  loadSource: NonNullable<ArazzoResolveOptions["loadSource"]>,
  url: string,
  description: ArazzoSourceDescriptionData,
): Promise<Loaded> {
  try {
    const input = await loadSource(url, description);
    if (input === undefined || input === null) {
      return { reason: "not-found", message: `loadSource returned nothing for ${url}.` };
    }
    return { input };
  } catch (err) {
    return { reason: "fetch-failed", message: `loadSource failed for ${url}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Gets the document for one source description, by the documented order of precedence. */
async function obtain(
  description: ArazzoSourceDescriptionData,
  context: SourceContext,
): Promise<{ loaded: Loaded; origin?: Origin; url?: string }> {
  const { sources, loadSource } = context.options;
  if (context.depth === 0 && sources && Object.prototype.hasOwnProperty.call(sources, description.name)) {
    return { loaded: { input: sources[description.name] }, origin: "sources" };
  }
  if (typeof description.url !== "string" || !description.url) {
    return { loaded: { reason: "not-provided", message: `Source "${description.name}" has no url and isn't in \`sources\`.` } };
  }

  const url = resolveUrl(description.url, context.baseUrl);
  if (!loadSource && !isAbsolute(url)) {
    return {
      url,
      loaded: {
        reason: "not-provided",
        message: `Source "${description.name}" (${description.url}) isn't in \`sources\`, and a relative url can only be fetched when \`baseUrl\` is set.`,
      },
    };
  }

  const origin: Origin = loadSource ? "loadSource" : "fetch";
  const key = `${origin}:${url}`;
  let load = context.loads.get(key);
  if (!load) {
    load = loadSource ? callLoadSource(loadSource, url, description) : fetchText(url);
    context.loads.set(key, load);
  }
  return { loaded: await load, origin, url };
}

/** Marks diagnostics as being about the source labelled `label`. Ones already about a deeper source keep their label. */
const attribute = (diagnostics: ArazzoDiagnostic[], label: string): ArazzoDiagnostic[] =>
  diagnostics.map((item) => ({ ...item, source: item.source ?? label }));

async function parseOpenAPISource(input: ArazzoSourceInput): Promise<{ document: OpenAPIDocumentData | null; diagnostics: ArazzoDiagnostic[] }> {
  if (typeof input === "string") {
    const result = await parseDocument(input);
    return { document: result.document && resolveDocument(result.document), diagnostics: result.diagnostics };
  }
  const version = input.openapi;
  if (typeof version !== "string" || !OPENAPI_3.test(version) || typeof input.info !== "object") {
    const message = "swagger" in input
      ? "OpenAPI 2.0 (Swagger) sources aren't supported. Convert the document to OpenAPI 3."
      : "Expected an OpenAPI 3.0 or 3.1 document.";
    return { document: null, diagnostics: [{ message, path: [], severity: 0 }] };
  }
  return { document: resolveDocument(input as OpenAPIDocumentData), diagnostics: [] };
}

async function parseArazzoSource(input: ArazzoSourceInput): Promise<{ document: Record<string, unknown> | null; diagnostics: ArazzoDiagnostic[] }> {
  if (typeof input !== "string") return { document: input, diagnostics: [] };
  return readArazzoText(input);
}

/** Resolves one source description. */
async function resolveSource(
  description: ArazzoSourceDescriptionData,
  index: number,
  context: SourceContext,
  buildNested: BuildNested,
): Promise<ArazzoSource> {
  const name = description.name;
  const path = ["sourceDescriptions", String(index)];
  const declared = typeof description.type === "string" ? description.type : undefined;
  const unresolved = (reason: ArazzoSourceUnresolvedReason, message: string, extra: Partial<ArazzoSource> = {}): ArazzoSource => ({
    status: "unresolved",
    name,
    description,
    type: declared,
    reason,
    message,
    diagnostics: [],
    path,
    ...extra,
  } as ArazzoSource);

  if (declared !== undefined && !SUPPORTED_TYPES.includes(declared)) {
    return unresolved("unsupported-type", `Source "${name}" is of type "${declared}", which apiuikit can't render yet.`);
  }

  // Declared Arazzo sources past the depth limit aren't even loaded.
  const maxDepth = context.options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const tooDeep = (extra: Partial<ArazzoSource>) =>
    unresolved("max-depth", `Source "${name}" is nested more than ${maxDepth} Arazzo documents deep.`, extra);
  if (declared === "arazzo" && context.depth + 1 > maxDepth) return tooDeep({});

  const { loaded, origin, url } = await obtain(description, context);
  if ("reason" in loaded) return unresolved(loaded.reason, loaded.message, { url });

  const detected = detectType(loaded.input);
  const type = declared ?? detected;
  if (declared && detected && detected !== declared && !(declared === "openapi" && detected === "swagger")) {
    return unresolved("type-mismatch", `Source "${name}" is declared as ${declared}, but its document is ${detected}.`, { url, type });
  }
  if (type !== "openapi" && type !== "arazzo") {
    return unresolved(
      type ? "unsupported-type" : "parse-failed",
      type ? `Source "${name}" is a ${type} document, which apiuikit can't render yet.` : `Couldn't tell what kind of document source "${name}" is.`,
      { url, type },
    );
  }

  const label = context.sourcePrefix ? `${context.sourcePrefix}/${name}` : name;

  if (type === "openapi") {
    const { document, diagnostics } = await parseOpenAPISource(loaded.input);
    const attributed = attribute(diagnostics, label);
    if (!document) {
      return unresolved("parse-failed", `Source "${name}" could not be parsed as OpenAPI.`, { url, type, diagnostics: attributed });
    }
    return { status: "resolved", type, name, description, url, origin: origin!, document, diagnostics: attributed, path };
  }

  // Cycles and depth are checked before parsing: a cyclic document is
  // already loaded, but there is no need to read it again.
  const identity = url ?? `sources:${label}`;
  if (context.chain.includes(identity)) {
    return unresolved("cycle", `Source "${name}" includes itself through its own sources (${[...context.chain, identity].join(" → ")}).`, { url, type });
  }
  if (context.depth + 1 > maxDepth) return tooDeep({ url, type });

  const { document, diagnostics } = await parseArazzoSource(loaded.input);
  if (!document) {
    return unresolved("parse-failed", `Source "${name}" could not be parsed as Arazzo.`, { url, type, diagnostics: attribute(diagnostics, label) });
  }
  const nested = await buildNested(document, {
    ...context,
    chain: [...context.chain, identity],
    depth: context.depth + 1,
    baseUrl: url && isAbsolute(url) ? url : context.baseUrl,
    sourcePrefix: label,
  });
  const all = attribute([...diagnostics, ...nested.diagnostics], label);
  if (!nested.model) {
    return unresolved("parse-failed", `Source "${name}" is not a renderable Arazzo document.`, { url, type, diagnostics: all });
  }
  return {
    status: "resolved",
    type,
    name,
    description,
    url,
    origin: origin!,
    document: nested.model.document as ArazzoDocumentData,
    model: nested.model,
    diagnostics: all,
    path,
  };
}

/** Resolves every source description of `document`, in parallel. */
export function resolveSources(
  descriptions: unknown[],
  context: SourceContext,
  buildNested: BuildNested,
): Promise<ArazzoSource[]> {
  return Promise.all(
    descriptions.map((description, index) => {
      if (!description || typeof description !== "object" || typeof (description as ArazzoSourceDescriptionData).name !== "string") {
        const item = (description ?? {}) as ArazzoSourceDescriptionData;
        return Promise.resolve<ArazzoSource>({
          status: "unresolved",
          name: "",
          description: item,
          reason: "not-provided",
          message: "The source description has no name.",
          diagnostics: [],
          path: ["sourceDescriptions", String(index)],
        });
      }
      return resolveSource(description as ArazzoSourceDescriptionData, index, context, buildNested);
    }),
  );
}
