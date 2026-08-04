import { useEffect, useRef, useState } from "react";
import AsyncAPI from "./AsyncAPI";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { ConfigInterface } from "../../config/config";
import { parseDocument } from "../../helpers/parser";

interface AsyncAPIRendererProps {
  /** Raw AsyncAPI document as a YAML or JSON string, parsed and validated internally via `@asyncapi/parser`. */
  raw: string;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Called with the parser's diagnostics (errors/warnings) after each parse attempt. */
  onDiagnostics?: (diagnostics: unknown[]) => void;
}

/**
 * Parses a raw AsyncAPI YAML/JSON string (via `@asyncapi/parser`) and renders
 * the same full documentation page as `AsyncAPI`. Use this when you have a
 * document as text rather than a pre-parsed object, e.g. user-entered or
 * loaded from a file at runtime.
 */
export function AsyncAPIRenderer({ raw, config, onDiagnostics }: AsyncAPIRendererProps) {
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
  return <AsyncAPI kind="resolved" asyncapi={document} config={config} />;
}
