import { createContext, useContext } from "react";
import type { AsyncAPIDocumentData } from "../types/schema";
import type { OpenAPIDocumentData } from "../types/openapi";
import type { MarkdownUrlResolver, SidePanelContainment } from "../config/config";

/** Which spec produced the ambient document. The discriminant of DocumentContextValue. */
export type SpecType = "asyncapi" | "openapi";

interface DocumentContextBase {
  /** Resolves a JSON Pointer $ref string to the object it references in the document. */
  deref: (ref: string) => unknown;
  portalHost: HTMLElement | null;
  /** The Layout component's own root element, used to scope viewport-fixed overlays (e.g. SidePanel) to where the <AsyncAPI> or <OpenAPI> widget is actually embedded, rather than the full browser viewport. */
  rootElement: HTMLElement | null;
  /** Where SidePanel overlays are clipped. Defaults to `"viewport"`. */
  sidePanelContainment: SidePanelContainment;
  /** Whether schema tree nodes start expanded by default. Defaults to false. */
  defaultSchemaExpanded?: boolean;
  /** Resolved schema tree depth-line colors (config-provided or default), cycled by nesting depth. */
  depthColors: string[];
  /** Whether to render known x-* spec extensions (see the `x-tensions` catalog). Defaults to true. */
  showExtensions: boolean;
  /** OpenAPI only: whether to render per-operation code samples (cURL/JS/Python). Defaults to true. */
  showCodeSamples: boolean;
  /** Resolves the hosted URL serving a target as Markdown, if the consumer serves one (config.markdown.url). Undefined means "View as Markdown" falls back to a generated `blob:` URL. */
  markdownUrl?: MarkdownUrlResolver;
}

export interface AsyncAPIDocumentContextValue extends DocumentContextBase {
  specType: "asyncapi";
  document: AsyncAPIDocumentData;
}

export interface OpenAPIDocumentContextValue extends DocumentContextBase {
  specType: "openapi";
  document: OpenAPIDocumentData;
}

/**
 * Discriminated on `specType`: checking it narrows `document` to the matching
 * spec's shape, so spec-specific consumers don't need to cast. Spec-agnostic
 * consumers that only need deref/portalHost/rootElement/depthColors (SidePanel,
 * SearchPanel, SchemaTree, ExpandToggle, ...) work under any provider without
 * looking at the discriminant.
 */
export type DocumentContextValue = AsyncAPIDocumentContextValue | OpenAPIDocumentContextValue;

// Shared by every spec type's provider (AsyncAPIDocumentProvider,
// OpenAPIDocumentProvider, ...): one context regardless of which spec
// produced the document.
export const DocumentContext = createContext<DocumentContextValue | null>(null);

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error(
      "useDocumentContext must be used within a document provider (AsyncAPIDocumentProvider or OpenAPIDocumentProvider)"
    );
  }
  return context;
};

// Back-compat aliases: AsyncAPI-facing code (and the public `useAsyncAPIDocument`
// export) keeps working unchanged. This is the same context object, just under
// its original name; the name was changed when OpenAPI support was added.
export const AsyncAPIDocumentContext = DocumentContext;
export const useAsyncAPIDocument = useDocumentContext;
