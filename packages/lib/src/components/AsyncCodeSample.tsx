import { useEffect, useId, useMemo, useState } from "react";
import { useDocumentContext } from "../contexts";
import { CodeBlock } from "./CodeBlock";
import {
  generateAsyncCodeSample,
  getAvailableAsyncCodeSampleTargets,
  pickDefaultAsyncCodeSampleSelection,
} from "../helpers/asyncCodeSample";
import { ensureHljsLanguage, hljsLanguageForTarget, isHljsLanguageReady } from "../helpers/hljsLanguages";

interface AsyncCodeSampleProps {
  operationId: string | null;
}

/** Per-operation "Example" panel for AsyncAPI, mirroring OpenAPI's
 * `CodeSamples`: a target/client dropdown (Agent Prompt, JS/`ws`, JS/browser
 * `WebSocket`, JS/`kafkajs`, Python/`websockets`, Python/`confluent-kafka`,
 * Rust, Go, ...) backed by asyncsnippet's target registry, pre-filtered to
 * this operation's protocol — the registry mixes clients for different
 * protocols under one flat list, and an operation is only ever reachable
 * over one of them, so an incompatible option never appears in the dropdown
 * in the first place (rather than appearing and blanking the panel when
 * picked). The initial selection is whichever compatible option actually
 * produces a snippet, not a fixed default — in practice this is Agent
 * Prompt, registered first in asyncsnippet's target registry. Renders
 * nothing when no compatible target/client produces a snippet for this
 * operation (no protocol-compatible client at all, or a message with no
 * example and no generatable schema). */
export function AsyncCodeSample({ operationId }: AsyncCodeSampleProps) {
  const { document, showCodeSamples } = useDocumentContext();
  const selectId = useId();

  const targets = useMemo(
    () => (operationId ? getAvailableAsyncCodeSampleTargets(document, operationId) : []),
    [document, operationId],
  );
  const defaultSelection = useMemo(
    () => pickDefaultAsyncCodeSampleSelection(document, operationId, targets),
    [document, operationId, targets],
  );
  // Operations reuses this component when the selected op changes (no remount
  // key). Store the user's dropdown choice scoped to the document+operation it
  // was picked for; when those identities change the override no longer
  // matches and we fall back to `defaultSelection` for this same render —
  // otherwise a stale target/client (e.g. javascript:ws after switching to
  // Kafka) would blank the panel. Derived rather than setState-during-render
  // or a useEffect reset, so render stays pure and snippet generation never
  // sees the previous op's selection.
  const [override, setOverride] = useState<{
    document: unknown;
    operationId: string | null;
    selection: string;
  } | null>(null);
  const activeSelection =
    override?.document === document && override.operationId === operationId
      ? override.selection
      : defaultSelection;
  const [targetKey, clientKey] = activeSelection.split(":");
  const hljsLanguage = hljsLanguageForTarget(targetKey);

  // Grammars beyond json/yaml/bash/javascript/python are lazy-loaded — this
  // triggers the load on selection and re-renders once it lands, covering
  // asyncsnippet's Rust/Go clients and future targets without further changes here.
  const [, setHljsReady] = useState(() => isHljsLanguageReady(hljsLanguage));
  useEffect(() => {
    setHljsReady(isHljsLanguageReady(hljsLanguage));
    let cancelled = false;
    ensureHljsLanguage(hljsLanguage).then(() => {
      if (!cancelled) setHljsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hljsLanguage]);

  const snippet = useMemo(
    () => (operationId ? generateAsyncCodeSample(document, operationId, targetKey, clientKey) : null),
    [document, operationId, targetKey, clientKey],
  );

  if (!showCodeSamples || !snippet) return null;

  return (
    <div id={`operation-${operationId}-code-sample`}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={selectId} className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
          Example
        </label>
        <select
          id={selectId}
          value={activeSelection}
          onChange={(event) =>
            setOverride({ document, operationId, selection: event.target.value })
          }
          aria-label="Code sample language"
          className="text-xs font-medium rounded-md border border-border bg-surface px-2 py-1 text-foreground-secondary focus:border-secondary-500 focus:ring-secondary-500"
        >
          {targets.map((target) => (
            <optgroup key={target.key} label={target.title}>
              {target.clients.map((client) => (
                <option key={client.key} value={`${target.key}:${client.key}`}>
                  {client.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <CodeBlock code={snippet} language={hljsLanguage} />
    </div>
  );
}

export default AsyncCodeSample;
