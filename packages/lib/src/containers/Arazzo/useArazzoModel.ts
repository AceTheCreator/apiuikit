import { useEffect, useRef, useState } from "react";
import { parseArazzoDocument, resolveArazzoDocument } from "../../helpers/arazzoModel";
import type { ArazzoDiagnostic, ArazzoParseResult, ArazzoResolveOptions, ArazzoSourceInput } from "../../types/arazzo";

type Sources = Record<string, ArazzoSourceInput> | undefined;

const sameSources = (a: Sources, b: Sources) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

/**
 * `sources={{ petstore: doc }}` is a new object on every render. Keep the
 * previous one while its entries are the same documents, so resolution reruns
 * when a source changes, not on every render.
 */
function useStableSources(sources: Sources): Sources {
  const ref = useRef(sources);
  if (!sameSources(ref.current, sources)) ref.current = sources;
  return ref.current;
}

/**
 * Resolves an Arazzo document (an object, or text to parse) and its sources.
 * Null until the first result; afterwards the previous result stays on screen
 * while a changed document resolves. `loadSource` and `onDiagnostics` are read
 * through refs, so passing inline functions doesn't re-resolve.
 */
export function useArazzoModel(
  input: { document: Record<string, unknown> } | { raw: string },
  { sources, baseUrl, loadSource, maxDepth }: ArazzoResolveOptions,
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void,
): ArazzoParseResult | null {
  const [result, setResult] = useState<ArazzoParseResult | null>(null);
  const stableSources = useStableSources(sources);

  const loadSourceRef = useRef(loadSource);
  loadSourceRef.current = loadSource;
  const onDiagnosticsRef = useRef(onDiagnostics);
  onDiagnosticsRef.current = onDiagnostics;
  const hasLoadSource = !!loadSource;

  const value = "raw" in input ? input.raw : input.document;

  useEffect(() => {
    let active = true;
    const options: ArazzoResolveOptions = {
      sources: stableSources,
      baseUrl,
      maxDepth,
      loadSource: hasLoadSource ? (url, description) => loadSourceRef.current?.(url, description) : undefined,
    };
    const pending = typeof value === "string" ? parseArazzoDocument(value, options) : resolveArazzoDocument(value, options);
    pending
      .catch((err): ArazzoParseResult => ({
        status: "unrenderable",
        diagnostics: [{ message: err instanceof Error ? err.message : "Failed to resolve the Arazzo document.", path: [], severity: 0 }],
        document: null,
        model: null,
      }))
      .then((next) => {
        if (!active) return;
        setResult(next);
        onDiagnosticsRef.current?.(next.diagnostics);
      });
    return () => {
      active = false;
    };
  }, [value, stableSources, baseUrl, maxDepth, hasLoadSource]);

  return result;
}
