import { useEffect, useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { containsRefs, resolveDocument } from "../../helpers/resolveDocument";
import { OpenAPIDocumentData } from "../../types/openapi";
import { ErrorBoundary, ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import type { ApiuikitPlugin } from "../../plugins/types";
import Layout, { OpenAPILayoutProps } from "./Layout";

export interface IOpenAPIProps {
  /** The parsed OpenAPI JSON, for example a JSON file you imported. `$ref`s in the object are resolved for you. */
  openapi: OpenAPIDocumentData;
  /** Theme, which sections to show, and sidebar options. */
  config?: ConfigInterface;
  /** Plugins that add UI to this page, such as a "try it" panel. */
  plugins?: ApiuikitPlugin[];
  /**
   * Pass `"resolved"` when the document is already fully dereferenced.
   * Leftover `$ref`s are still resolved, and a warning is logged.
   */
  kind?: "resolved";
  /** UI shown if rendering throws. A built-in fallback is used when this is omitted. */
  errorFallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /** Called when rendering throws, for example to report it to your own logging. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Which tab and item to select on first render, for example from a URL. Applied once. */
  initialLocation?: OpenAPILayoutProps["initialLocation"];
  /** Called when the selected tab or item changes, for example to keep a URL in sync. */
  onLocationChange?: OpenAPILayoutProps["onLocationChange"];
}

/**
 * A full OpenAPI documentation page: sidebar, search, servers, endpoints, and
 * schemas. Webhooks appear when the document declares them. Pass `openapi` the
 * parsed JSON. For a YAML or JSON string, use OpenAPIRenderer, which parses
 * the text first.
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
  return (
    <Layout
      openapi={openapi}
      config={config}
      plugins={props.plugins}
      initialLocation={props.initialLocation}
      onLocationChange={props.onLocationChange}
    />
  );
};

export default OpenAPI;
