import { useEffect, useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { containsRefs, resolveDocument } from "../../helpers/resolveDocument";
import { AsyncAPIDocumentData } from "../../types/schema";
import { ErrorBoundary, ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import type { ApiuikitPlugin } from "../../plugins/types";
import Layout, { LayoutProps } from "./Layout";

export interface IAsyncAPIProps {
  /** The parsed AsyncAPI JSON, for example a JSON file you imported. `$ref`s in the object are resolved for you. */
  asyncapi: AsyncAPIDocumentData;
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
  initialLocation?: LayoutProps["initialLocation"];
  /** Called when the selected tab or item changes, for example to keep a URL in sync. */
  onLocationChange?: LayoutProps["onLocationChange"];
}

/**
 * A full AsyncAPI documentation page: sidebar, search, servers, operations,
 * messages, and schemas. Pass `asyncapi` the parsed JSON. For a YAML or JSON
 * string, use AsyncAPIRenderer, which parses the text first.
 */
const AsyncAPI = (props: IAsyncAPIProps) => (
  // The boundary is deliberately the outermost thing this component renders:
  // React only catches throws from a boundary's *descendants*, so document
  // resolution has to happen one level down (in AsyncAPIContent) to be covered
  // by it. Resolving here would put it outside its own boundary.
  <ErrorBoundary fallback={props.errorFallback} onError={props.onError}>
    <AsyncAPIContent {...props} />
  </ErrorBoundary>
);

const AsyncAPIContent = (props: IAsyncAPIProps) => {
  const raw = props.asyncapi;
  // Always normalize: documents already meeting resolveDocument's contract
  // (no $refs, no object cycles) pass through its cheap scan untouched,
  // identity preserved, no copy. Documents that still carry refs get inlined
  // even if the caller wrongly promised they were pre-resolved, and parser
  // output with real object cycles (recursive schemas) gets those cycles cut
  // back into `$ref` nodes.
  const asyncapi = useMemo(() => resolveDocument(raw), [raw]);

  // kind="resolved" is a verified promise, not a fast path. Normalization
  // alone (asyncapi !== raw) is not proof it was false: parser output
  // legitimately gets its recursive-schema cycles cut here too, so only
  // leftover $ref nodes count as a broken promise worth reporting.
  const kind = props.kind;
  useEffect(() => {
    if (kind === "resolved" && asyncapi !== raw && containsRefs(raw)) {
      console.warn(
        '[apiuikit] <AsyncAPI kind="resolved"> received a document that still contains $ref nodes. ' +
          "They were resolved anyway; fix the upstream resolution or drop the kind prop.",
      );
    }
  }, [kind, raw, asyncapi]);

  const config = props.config ?? defaultConfig;
  return (
    <Layout
      asyncapi={asyncapi}
      config={config}
      plugins={props.plugins}
      initialLocation={props.initialLocation}
      onLocationChange={props.onLocationChange}
    />
  );
};

export default AsyncAPI;
