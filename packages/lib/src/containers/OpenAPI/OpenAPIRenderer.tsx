import { useEffect, useRef, useState } from "react";
import OpenAPI from "./OpenAPI";
import type { OpenAPIDocumentData } from "../../types/openapi";
import type { ConfigInterface } from "../../config/config";
import type { ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ErrorInfo, ReactNode } from "react";
import { parseDocument } from "../../helpers/openapiParser";

interface OpenAPIRendererProps {
  /** Raw OpenAPI document as a YAML or JSON string, parsed and validated internally via `@readme/openapi-parser`. */
  raw: string;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Called with the parser's diagnostics (errors/warnings) after each parse attempt. */
  onDiagnostics?: (diagnostics: unknown[]) => void;
  /** Custom UI shown if rendering the parsed document throws. Defaults to a built-in fallback. */
  errorFallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /** Called once when a render error is caught. Parse failures arrive via `onDiagnostics` instead: an error boundary only sees synchronous render errors. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Parses a raw OpenAPI YAML/JSON string (via `@readme/openapi-parser`) and
 * renders the same full documentation page as `OpenAPI`. Use this when you
 * have a document as text rather than a pre-parsed object, e.g. user-entered
 * or loaded from a file at runtime.
 */
export function OpenAPIRenderer({ raw, config, onDiagnostics, errorFallback, onError }: OpenAPIRendererProps) {
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
      errorFallback={errorFallback}
      onError={onError}
    />
  );
}
