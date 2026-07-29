import { useEffect, useId, useMemo, useState } from "react";
import { useDocumentContext } from "../contexts";
import { CodeBlock } from "./CodeBlock";
import { generateSchemaExample } from "../helpers/schemaExample";
import {
  buildHarRequest,
  DEFAULT_CODE_SAMPLE_CLIENT,
  DEFAULT_CODE_SAMPLE_TARGET,
  generateSnippet,
  getAvailableCodeSampleTargets,
  pickRequestBodyMedia,
} from "../helpers/codeSamples";
import { ensureHljsLanguage, hljsLanguageForTarget, isHljsLanguageReady } from "../helpers/hljsLanguages";
import { HttpMethod, OpenAPIDocumentData, OpenAPIParameterData, OpenAPIRequestBodyData } from "../types/openapi";

interface CodeSamplesProps {
  method: HttpMethod;
  path: string;
  parameters: OpenAPIParameterData[];
  requestBody?: OpenAPIRequestBodyData;
  /** Already resolved by the caller: `op.security ?? globalSecurity ?? []`. */
  security: Array<Record<string, string[]>>;
  id: string | null;
}

const DEFAULT_SELECTION = `${DEFAULT_CODE_SAMPLE_TARGET}:${DEFAULT_CODE_SAMPLE_CLIENT}`;

export function CodeSamples({ method, path, parameters, requestBody, security, id }: CodeSamplesProps) {
  const { document, showCodeSamples } = useDocumentContext();
  const doc = document as OpenAPIDocumentData;
  const selectId = useId();

  // Static per-render-tree: the full curl/fetch/axios/.../Go/Rust/... catalog
  // @readme/httpsnippet ships, grouped by target for the <optgroup> dropdown.
  const targets = useMemo(() => getAvailableCodeSampleTargets(), []);
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [targetKey, clientKey] = selection.split(":");
  const hljsLanguage = hljsLanguageForTarget(targetKey);

  const media = useMemo(() => pickRequestBodyMedia(requestBody), [requestBody]);
  const [generatedBody, setGeneratedBody] = useState<unknown>(undefined);

  useEffect(() => {
    setGeneratedBody(undefined);
    if (!media || media.authorExample !== undefined || !media.schema) return;
    let cancelled = false;
    generateSchemaExample(media.schema as Record<string, unknown>).then((result) => {
      if (!cancelled) setGeneratedBody(result);
    });
    return () => {
      cancelled = true;
    };
  }, [media]);

  // Grammars beyond json/yaml/bash/javascript/python are lazy-loaded — this
  // triggers the load on selection and re-renders once it lands so the
  // snippet picks up highlighting instead of staying plain forever.
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

  const harRequest = useMemo(
    () =>
      buildHarRequest({
        method,
        path,
        servers: doc.servers,
        parameters,
        security,
        securitySchemes: doc.components?.securitySchemes,
        media,
        resolvedBodyValue: media?.authorExample ?? generatedBody,
      }),
    [method, path, doc.servers, parameters, security, doc.components?.securitySchemes, media, generatedBody],
  );

  const snippet = useMemo(
    () => generateSnippet(harRequest, targetKey, clientKey),
    [harRequest, targetKey, clientKey],
  );

  if (!showCodeSamples) return null;

  return (
    <div id={`endpoint-${id}-code-samples`}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={selectId} className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
          Example Request
        </label>
        <select
          id={selectId}
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
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

export default CodeSamples;
