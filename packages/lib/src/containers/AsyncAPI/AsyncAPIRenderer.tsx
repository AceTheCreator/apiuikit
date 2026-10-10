import { useEffect, useRef, useState } from "react";
import AsyncAPI from "./AsyncAPI";
import type { IAsyncAPIProps } from "./AsyncAPI";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { ConfigInterface } from "../../config/config";
import type { ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import type { ApiuikitPlugin } from "../../plugins/types";
import { parseDocument } from "../../helpers/parser";

interface AsyncAPIRendererProps {
  /** The AsyncAPI document as a YAML or JSON string. It is parsed before the page renders. */
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
  initialLocation?: IAsyncAPIProps["initialLocation"];
  /** Called when the selected tab or item changes, for example to keep a URL in sync. */
  onLocationChange?: IAsyncAPIProps["onLocationChange"];
}

/**
 * The same full AsyncAPI page as AsyncAPI, starting from the document as text.
 * Pass `raw` a YAML or JSON string. Parser errors and warnings are handed to
 * `onDiagnostics`.
 */
export function AsyncAPIRenderer({
  raw,
  config,
  plugins,
  onDiagnostics,
  errorFallback,
  onError,
  initialLocation,
  onLocationChange,
}: AsyncAPIRendererProps) {
  const [document, setDocument] = useState<AsyncAPIDocumentData | null>(null);

  // Keep the latest onDiagnostics without making the effect below re-run (and
  // therefore re-parse) whenever the caller passes a new callback identity.
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
    // Only re-parse when the raw document text changes: `config` (e.g. a theme
    // toggle) should re-render immediately with the already-parsed document,
    // not wait on a fresh ~500ms parse.
  }, [raw]);

  if (!document) return null;
  return (
    <AsyncAPI
      kind="resolved"
      asyncapi={document}
      config={config}
      plugins={plugins}
      errorFallback={errorFallback}
      onError={onError}
      initialLocation={initialLocation}
      onLocationChange={onLocationChange}
    />
  );
}
