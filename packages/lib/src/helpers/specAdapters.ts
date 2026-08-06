/**
 * Per-spec adapters behind the spec-agnostic document helpers
 * (`listDocumentTargets`, `documentToMarkdown`, `documentToLlmsTxt`).
 *
 * Everything a spec needs to answer "what's linkable in this document, what
 * do I call it, and how do I serialize it?" lives in one adapter object.
 * Supporting a new spec means adding one entry to ADAPTERS below: no public
 * API changes, and no `if (openapi) ... else if (asyncapi) ...` chains spread
 * across the helpers.
 */
import type { MarkdownTarget } from "../config/config";
import type { AsyncAPIDocumentData } from "../types/schema";
import { flattenEndpoints, HTTP_METHODS, type OpenAPIDocumentData } from "../types/openapi";
import {
  asyncApiOperationToMarkdown,
  asyncApiToMarkdown,
  openApiEndpointToMarkdown,
  openApiToMarkdown,
} from "./toMarkdown";

/** One linkable item in a document: an OpenAPI endpoint, an AsyncAPI operation, ... */
export interface DocumentTarget {
  /** Stable identifier, unique within the document. `"get /pets"`, `"sendLightMeasurement"`. */
  key: string;
  /** Human-readable label for a link or heading. `"GET /pets"`. */
  label: string;
  /** The document's own one-line summary for this item, when it has one. */
  summary?: string;
  /** Passed to `documentToMarkdown`, and the same shape `config.markdown.url` receives. */
  target: MarkdownTarget;
}

interface SpecAdapter {
  /** Spec name, used in error messages. */
  name: string;
  /** Whether this adapter handles the document, sniffed from its version key. */
  matches: (doc: Record<string, unknown>) => boolean;
  /** What the linkable items are called collectively, e.g. "Endpoints". */
  sectionTitle: string;
  title: (doc: unknown) => string;
  summary: (doc: unknown) => string | undefined;
  targets: (doc: unknown) => DocumentTarget[];
  toMarkdown: (doc: unknown, target?: MarkdownTarget) => string;
}

type TypedSpecAdapter<D extends object> = Omit<SpecAdapter, "title" | "summary" | "targets" | "toMarkdown"> & {
  title: (doc: D) => string;
  summary: (doc: D) => string | undefined;
  targets: (doc: D) => DocumentTarget[];
  toMarkdown: (doc: D, target?: MarkdownTarget) => string;
};

/** Keeps each adapter strongly typed while erasing its document type once at
 * the registry boundary. Public dispatch no longer needs scattered `never`
 * casts to call an adapter selected at runtime. */
function defineSpecAdapter<D extends object>(adapter: TypedSpecAdapter<D>): SpecAdapter {
  return {
    ...adapter,
    title: (doc) => adapter.title(doc as D),
    summary: (doc) => adapter.summary(doc as D),
    targets: (doc) => adapter.targets(doc as D),
    toMarkdown: (doc, target) => adapter.toMarkdown(doc as D, target),
  };
}

/** First line of a description, for a one-line link summary. */
const firstLine = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const line = value.trim().split("\n")[0]?.trim();
  return line || undefined;
};

const isHttpMethod = (value: string | undefined): value is (typeof HTTP_METHODS)[number] =>
  HTTP_METHODS.some((method) => method === value);

const openapi = defineSpecAdapter<OpenAPIDocumentData>({
  name: "OpenAPI",
  matches: (doc) => typeof doc.openapi === "string" || typeof doc.swagger === "string",
  sectionTitle: "Endpoints",
  title: (doc: OpenAPIDocumentData) => doc.info?.title ?? "API",
  summary: (doc: OpenAPIDocumentData) => firstLine(doc.info?.description),
  targets: (doc: OpenAPIDocumentData) =>
    flattenEndpoints(doc.paths ?? {}).map(({ key, method, path }) => {
      const operation = doc.paths?.[path]?.[method];
      return {
        key,
        label: `${method.toUpperCase()} ${path}`,
        summary: firstLine(operation?.summary) ?? firstLine(operation?.description),
        target: { kind: "operation", document: doc, method, path },
      };
    }),
  toMarkdown: (doc, target) => {
    if (!target || target.kind === "document") return openApiToMarkdown(doc);
    if (typeof target.path !== "string" || !isHttpMethod(target.method)) {
      throw new Error("[apiuikit] An OpenAPI operation target requires a valid method and path.");
    }
    return openApiEndpointToMarkdown(doc, target.method, target.path);
  },
});

const asyncapi = defineSpecAdapter<AsyncAPIDocumentData>({
  name: "AsyncAPI",
  matches: (doc) => typeof doc.asyncapi === "string",
  sectionTitle: "Operations",
  title: (doc: AsyncAPIDocumentData) => doc.info?.title ?? "API",
  summary: (doc: AsyncAPIDocumentData) => firstLine(doc.info?.description),
  targets: (doc: AsyncAPIDocumentData) =>
    Object.entries(doc.operations ?? {}).map(([key, operation]) => ({
      key,
      label: operation?.action ? `${operation.action.toUpperCase()} ${key}` : key,
      summary: firstLine(operation?.summary) ?? firstLine(operation?.description),
      target: { kind: "operation", document: doc, id: key },
    })),
  toMarkdown: (doc, target) => {
    if (!target || target.kind === "document") return asyncApiToMarkdown(doc);
    if (typeof target.id !== "string" || !target.id) {
      throw new Error("[apiuikit] An AsyncAPI operation target requires an operation id.");
    }
    return asyncApiOperationToMarkdown(doc, target.id);
  },
});

/** Add a spec by adding its adapter here. Order only matters if two adapters
 * could match the same document, which the version-key sniffing prevents. */
const ADAPTERS: SpecAdapter[] = [openapi, asyncapi];

/**
 * Picks the adapter for a document by sniffing its version key (`openapi`,
 * `swagger`, `asyncapi`), the same discriminant the renderers use to choose a
 * component. Throws rather than guessing: silently treating an unrecognized
 * document as one spec would emit confidently wrong output.
 */
export function adapterFor(document: unknown): SpecAdapter {
  const doc = (typeof document === "object" && document !== null ? document : {}) as Record<string, unknown>;
  const adapter = ADAPTERS.find((candidate) => candidate.matches(doc));

  if (!adapter) {
    throw new Error(
      `[apiuikit] Unrecognized document: expected a top-level "openapi", "swagger", or "asyncapi" version key. ` +
        `Supported specs: ${ADAPTERS.map((a) => a.name).join(", ")}.`,
    );
  }
  return adapter;
}
