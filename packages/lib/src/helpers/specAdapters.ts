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
import type { ArazzoModel } from "../types/arazzo";
import { arazzoToMarkdown, arazzoWorkflowToMarkdown } from "./arazzoToMarkdown";
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

const isArazzoModel = (doc: Record<string, unknown>) =>
  Array.isArray(doc.workflows) && Array.isArray(doc.sources) && typeof doc.document === "object" && doc.document !== null;

/**
 * Arazzo is serialized from its resolved model, not the document: saying what
 * a step calls needs its source loaded, which is asynchronous, and these
 * helpers are synchronous. A plain document is pointed at the resolver rather
 * than exported with every step unlinked.
 */
function requireArazzoModel(doc: ArazzoModel): ArazzoModel {
  if (!isArazzoModel(doc as unknown as Record<string, unknown>)) {
    throw new Error(
      "[apiuikit] Arazzo documents are exported from their resolved model, which has the sources loaded. " +
        "Resolve it first: `const { model } = await resolveArazzoDocument(document, { sources })`, then pass `model`.",
    );
  }
  return doc;
}

const arazzo = defineSpecAdapter<ArazzoModel>({
  name: "Arazzo",
  // The model keeps the version under the same `arazzo` key as the document.
  matches: (doc) => typeof doc.arazzo === "string",
  sectionTitle: "Workflows",
  title: (doc) => requireArazzoModel(doc).info.title ?? "Workflows",
  summary: (doc) => {
    const { info } = requireArazzoModel(doc);
    return firstLine(info.summary) ?? firstLine(info.description);
  },
  targets: (doc) =>
    requireArazzoModel(doc).workflows.map((workflow) => ({
      key: workflow.workflowId,
      label: workflow.summary ?? workflow.workflowId,
      summary: firstLine(workflow.description),
      target: { kind: "workflow", document: doc, id: workflow.workflowId },
    })),
  toMarkdown: (doc, target) => {
    const model = requireArazzoModel(doc);
    if (!target || target.kind === "document") return arazzoToMarkdown(model);
    if (target.kind !== "workflow" || typeof target.id !== "string" || !target.id) {
      throw new Error("[apiuikit] An Arazzo target requires a workflow id.");
    }
    return arazzoWorkflowToMarkdown(model, target.id);
  },
});

/** Add a spec by adding its adapter here. Order only matters if two adapters
 * could match the same document, which the version-key sniffing prevents. */
const ADAPTERS: SpecAdapter[] = [openapi, asyncapi, arazzo];

/**
 * Picks the adapter for a document by sniffing its version key (`openapi`,
 * `swagger`, `asyncapi`, `arazzo`), the same discriminant the renderers use to choose a
 * component. Throws rather than guessing: silently treating an unrecognized
 * document as one spec would emit confidently wrong output.
 */
export function adapterFor(document: unknown): SpecAdapter {
  const doc = (typeof document === "object" && document !== null ? document : {}) as Record<string, unknown>;
  const adapter = ADAPTERS.find((candidate) => candidate.matches(doc));

  if (!adapter) {
    throw new Error(
      `[apiuikit] Unrecognized document: expected a top-level "openapi", "swagger", "asyncapi" or "arazzo" version key. ` +
        `Supported specs: ${ADAPTERS.map((a) => a.name).join(", ")}.`,
    );
  }
  return adapter;
}
