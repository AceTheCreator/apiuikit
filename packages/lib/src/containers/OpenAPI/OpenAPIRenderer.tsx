import { useEffect, useRef, useState } from "react";
import OpenAPI from "./OpenAPI";
import type { IOpenAPIProps } from "./OpenAPI";
import type { OpenAPIDocumentData } from "../../types/openapi";
import type { ConfigInterface } from "../../config/config";
import type { ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import type { ApiuikitPlugin } from "../../plugins/types";
import { parseDocument } from "../../helpers/openapiParser";

interface OpenAPIRendererProps {
  /** The OpenAPI document as a YAML or JSON string. It is parsed before the page renders. */
  raw: string;
  /** Theme, which sections to show, and sidebar options. */
  config?: ConfigInterface;
  /** Plugins that add UI to this page, such as a "try it" panel. */
  plugins?: ApiuikitPlugin[];
  /**
   * Called with parser errors and warnings after each parse.
   * A document that fails to parse does not render a page; this is where you hear about it.
   */
  onDiagnostics?: (diagnostics: unknown[]) => void;
  /** UI shown if rendering the parsed document throws. A built-in fallback is used when this is omitted. */
  errorFallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /**
   * Called when rendering throws, for example to report it to your own logging.
   * Parse failures are reported through `onDiagnostics` instead.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Which tab and item to select once the parsed document first renders, for example from a URL. Applied once. */
  initialLocation?: IOpenAPIProps["initialLocation"];
  /** Called when the selected tab or item changes, for example to keep a URL in sync. */
  onLocationChange?: IOpenAPIProps["onLocationChange"];
}

/**
 * The same full OpenAPI page as OpenAPI, starting from the document as text.
 * Pass `raw` a YAML or JSON string. Parser errors and warnings are handed to
 * `onDiagnostics`.
 */
export function OpenAPIRenderer({
  raw,
  config,
  plugins,
  onDiagnostics,
  errorFallback,
  onError,
  initialLocation,
  onLocationChange,
}: OpenAPIRendererProps) {
  const [document, setDocument] = useState<OpenAPIDocumentData | null>(null);

  const onDiagnosticsRef = useRef(onDiagnostics);
  onDiagnosticsRef.current = onDiagnostics;

  useEffect(() => {
    let active = true;
    parseDocument(raw).then(({ document, diagnostics }) => {
      if (!active) return;
      setDocument(document);
      onDiagnosticsRef.current?.(diagnostics);
    });
    return () => {
      active = false;
    };
  }, [raw]);

  if (!document) return null;
  return (
    <OpenAPI
      kind="resolved"
      openapi={document}
      config={config}
      plugins={plugins}
      errorFallback={errorFallback}
      onError={onError}
      initialLocation={initialLocation}
      onLocationChange={onLocationChange}
    />
  );
}
