import { useEffect, useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { containsRefs, resolveDocument } from "../../helpers/resolveDocument";
import { OpenAPIDocumentData } from "../../types/openapi";
import { ErrorBoundary, ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import Layout from "./Layout";

export interface IOpenAPIProps {
  /** A pre-resolved OpenAPI 3.0/3.1 document object, or one that still contains `$ref`s. */
  openapi: OpenAPIDocumentData;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Promise that `openapi` is already fully dereferenced upstream. Verified rather than trusted: `$ref`s left in place are still resolved either way, with a console warning that the promise was false. */
  kind?: "resolved";
  /** Custom UI shown if rendering this document throws. Defaults to a built-in fallback. */
  errorFallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /** Called once when a render error is caught, e.g. to report it to your own logging/telemetry. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Renders a full OpenAPI documentation page: sidebar navigation, search,
 * servers, endpoints, and schemas. Pass a pre-resolved (or `$ref`-carrying)
 * document object; for raw YAML/JSON strings, use `OpenAPIRenderer` instead,
 * which parses first.
 */
const OpenAPI = (props: IOpenAPIProps) => (
  // The boundary is deliberately the outermost thing this component renders:
  // React only catches throws from a boundary's *descendants*, so document
  // resolution has to happen one level down (in OpenAPIContent) to be covered
  // by it. Resolving here would put it outside its own boundary.
  <ErrorBoundary fallback={props.errorFallback} onError={props.onError}>
    <OpenAPIContent {...props} />
  </ErrorBoundary>
);

const OpenAPIContent = (props: IOpenAPIProps) => {
  const raw = props.openapi;
  // Always normalize: documents already meeting resolveDocument's contract
  // (no $refs, no object cycles) pass through its cheap scan untouched,
  // identity preserved, no copy. Documents that still carry refs get inlined
  // even if the caller wrongly promised they were pre-resolved, and parser
  // output with real object cycles (recursive schemas) gets those cycles cut
  // back into `$ref` nodes.
  const openapi = useMemo(() => resolveDocument(raw), [raw]);

  // kind="resolved" is a verified promise, not a fast path. Normalization
  // alone (openapi !== raw) is not proof it was false: parser output
  // legitimately gets its recursive-schema cycles cut here too, so only
  // leftover $ref nodes count as a broken promise worth reporting.
  const kind = props.kind;
  useEffect(() => {
    if (kind === "resolved" && openapi !== raw && containsRefs(raw)) {
      console.warn(
        '[apiuikit] <OpenAPI kind="resolved"> received a document that still contains $ref nodes. ' +
          "They were resolved anyway; fix the upstream resolution or drop the kind prop.",
      );
    }
  }, [kind, raw, openapi]);

  const config = props.config ?? defaultConfig;
  return <Layout openapi={openapi} config={config} />;
};

export default OpenAPI;
