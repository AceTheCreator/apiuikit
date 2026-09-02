import { useContext, useMemo } from "react";
import { DocumentContext } from "../contexts";
import { AsyncAPIDocumentProvider } from "../containers/AsyncAPI/AsyncAPIDocumentProvider";
import { OpenAPIDocumentProvider } from "../containers/OpenAPI/OpenAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";
import { AsyncAPIDocumentData, SchemaNodeData } from "../types/schema";
import { OpenAPIDocumentData } from "../types/openapi";
import SchemasContainer from "../containers/Schema/Schemas";
import type { SectionLayout } from "../components/Section";

/**
 * The one schemas section, for either spec. `components.schemas` is the exact
 * same `Record<string, SchemaNodeData>` on AsyncAPIDocumentData and
 * OpenAPIDocumentData (types/openapi.ts takes SchemaNodeData from
 * types/schema.ts), and the container reads nothing else off the document, so
 * unlike the other sections this one has no spec-specific behaviour to gate on
 * — an ambient provider of either spec type can supply it, and there is
 * nothing for a mismatch warning to warn about.
 */

export interface SchemasSectionProps {
  /** An AsyncAPI or OpenAPI document. Required standalone; unnecessary (and ignored) inside a provider. */
  document?: AsyncAPIDocumentData | OpenAPIDocumentData;
  /** Only applied when this section sets up its own context (standalone). */
  config?: ConfigInterface;
  /** Only applied when this section sets up its own context (standalone). When
   * composed under a provider, that provider's own `plugins` apply. */
  plugins?: ApiuikitPlugin[];
  /**
   * `"columns"` (default) — reserved right gutter at large breakpoints.
   * `"stacked"` — full-width single column; no prose max-width and no empty
   * side space.
   */
  layout?: SectionLayout;
}

type AnyDocument = AsyncAPIDocumentData | OpenAPIDocumentData;

const isOpenAPI = (document: AnyDocument): document is OpenAPIDocumentData => {
  const doc = document as Record<string, unknown>;
  return typeof doc.openapi === "string" || typeof doc.swagger === "string";
};

function SchemasBody({ layout }: { layout?: SectionLayout }) {
  const context = useContext(DocumentContext);
  const schemas = (context?.document?.components?.schemas ?? {}) as Record<string, SchemaNodeData>;
  return <SchemasContainer schemas={schemas} layout={layout} />;
}

export function Schemas({ document, config, plugins, layout }: SchemasSectionProps) {
  const ambient = useContext(DocumentContext);
  const resolved = useMemo(
    () => (document ? resolveDocument(document) : null),
    [document],
  );

  if (ambient) return <SchemasBody layout={layout} />;

  if (!resolved) {
    throw new Error(
      "The Schemas section needs a `document` prop unless it is rendered inside " +
        "<AsyncAPIProvider> or <OpenAPIProvider>.",
    );
  }

  // The container needs a document context for `deref`; which provider
  // establishes it is otherwise immaterial here, so pick by the document's own
  // version key.
  if (isOpenAPI(resolved)) {
    return (
      <OpenAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
        <SchemasBody layout={layout} />
      </OpenAPIDocumentProvider>
    );
  }

  return (
    <AsyncAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
      <SchemasBody layout={layout} />
    </AsyncAPIDocumentProvider>
  );
}

/** @deprecated Use `Schemas` — the schemas section is the same for both specs. */
export const AsyncAPISchemas = Schemas;
/** @deprecated Use `Schemas` — the schemas section is the same for both specs. */
export const OpenAPISchemas = Schemas;
