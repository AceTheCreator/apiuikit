import { createContext, useContext } from "react";

type AsyncAPIDocument = Record<string, unknown>;

interface AsyncAPIContextValue {
  document: AsyncAPIDocument;
  /** Resolves a JSON Pointer $ref string to the object it references in the document. */
  deref: (ref: string) => unknown;
  portalHost: HTMLElement | null;
  /** The Layout component's own root element — used to scope viewport-fixed overlays (e.g. SidePanel) to where <AsyncAPI> is actually embedded, rather than the full browser viewport. */
  rootElement: HTMLElement | null;
  /** Whether schema tree nodes start expanded by default. Defaults to false. */
  defaultSchemaExpanded?: boolean;
  /** Resolved schema tree depth-line colors (config-provided or default), cycled by nesting depth. */
  depthColors: string[];
  /** Whether to render known x-* spec extensions (see the `x-tensions` catalog). Defaults to true. */
  showExtensions: boolean;
}

export const AsyncAPIDocumentContext =
  createContext<AsyncAPIContextValue | null>(null);

export const useAsyncAPIDocument = () => {
  const context = useContext(AsyncAPIDocumentContext);
  if (!context) {
    throw new Error(
      "useAsyncAPIDocument must be used within an AsyncAPIDocumentProvider"
    );
  }
  return context;
};
