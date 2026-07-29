import { createContext, useContext } from "react";

type SpecDocument = Record<string, unknown>;

interface DocumentContextValue {
  document: SpecDocument;
  /** Resolves a JSON Pointer $ref string to the object it references in the document. */
  deref: (ref: string) => unknown;
  portalHost: HTMLElement | null;
  /** The Layout component's own root element — used to scope viewport-fixed overlays (e.g. SidePanel) to where the <AsyncAPI> or <OpenAPI> widget is actually embedded, rather than the full browser viewport. */
  rootElement: HTMLElement | null;
  /** Whether schema tree nodes start expanded by default. Defaults to false. */
  defaultSchemaExpanded?: boolean;
  /** Resolved schema tree depth-line colors (config-provided or default), cycled by nesting depth. */
  depthColors: string[];
  /** Whether to render known x-* spec extensions (see the `x-tensions` catalog). Defaults to true. */
  showExtensions: boolean;
  /** OpenAPI only: whether to render per-operation code samples (cURL/JS/Python). Defaults to true. */
  showCodeSamples: boolean;
}

// Shared by every spec type's provider (AsyncAPIDocumentProvider,
// OpenAPIDocumentProvider, ...) — `document` is intentionally untyped here,
// so the same context works regardless of which spec produced it. Presentational
// components that only need deref/portalHost/rootElement/depthColors (SidePanel,
// SearchPanel, SchemaTree, ExpandToggle, ...) are spec-agnostic and work under
// any provider without change.
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
// export) keeps working unchanged — this is the same context object, just under
// its original name.
// The name was changed for supporting openapi also.
export const AsyncAPIDocumentContext = DocumentContext;
export const useAsyncAPIDocument = useDocumentContext;
