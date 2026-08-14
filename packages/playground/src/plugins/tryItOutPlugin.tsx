import { useMemo, useState } from "react";
import { buildHarRequest, definePlugin } from "apiuikit/plugin";
import type { OpenAPIOperationActionsContext, OpenAPIParameterData } from "apiuikit/plugin";

// Playground-local dev fixture for dogfooding the `openapi.operation.tab`
// plugin slot — not a published package. A real "try it out" plugin ships
// from its own separately-maintained repo/package; this is only here so
// contributors working on the plugin architecture (packages/lib) have
// something concrete to click through in the playground.

function paramKey(param: OpenAPIParameterData): string {
  return `${param.in}:${param.name}`;
}

interface FetchResult {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
}

// apiuikit applies these as CSS custom properties (each "r g b" channel
// values) on the document root, resolved from the host's `config.theme` with
// apiuikit's own defaults filling in whatever the host didn't set — see
// ThemeConfig in `apiuikit/plugin`. Reading them here (rather than hardcoding
// hex) means this panel automatically follows the host's theme, including
// live theme changes, without needing its own copy of the resolved colors.
// The fallback after the comma only matters if this ever renders outside an
// apiuikit tree, where the variables wouldn't be defined at all.
const color = {
  border: "rgb(var(--color-border, 228 228 231) / 1)",
  surface: "rgb(var(--color-surface, 250 250 250) / 1)",
  textPrimary: "rgb(var(--color-text-primary, 24 24 27) / 1)",
  textSecondary: "rgb(var(--color-text-secondary, 82 82 91) / 1)",
  primary600: "rgb(var(--color-primary-600, 24 24 27) / 1)",
};

const styles = {
  // Fills the tab body directly — apiuikit's operation panel already
  // supplies the surrounding padding, so this isn't a nested card.
  panel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  field: { display: "flex", flexDirection: "column" as const, gap: "0.25rem" },
  label: { fontSize: "0.75rem", fontWeight: 500, color: color.textSecondary },
  input: {
    fontSize: "0.8125rem",
    padding: "0.375rem 0.5rem",
    borderRadius: "0.25rem",
    border: `1px solid ${color.border}`,
    color: color.textPrimary,
    background: "transparent",
    fontFamily: "inherit",
  },
  textarea: {
    fontSize: "0.75rem",
    padding: "0.5rem",
    borderRadius: "0.25rem",
    border: `1px solid ${color.border}`,
    color: color.textPrimary,
    background: "transparent",
    fontFamily: "ui-monospace, monospace",
    minHeight: "5rem",
    resize: "vertical" as const,
  },
  send: {
    alignSelf: "flex-start",
    fontSize: "0.8125rem",
    fontWeight: 500,
    padding: "0.375rem 0.875rem",
    borderRadius: "0.375rem",
    border: "none",
    background: color.primary600,
    color: "#fff",
    cursor: "pointer",
  },
  error: { fontSize: "0.8125rem", color: "#dc2626" },
  result: {
    fontSize: "0.75rem",
    padding: "0.5rem",
    borderRadius: "0.25rem",
    background: color.surface,
    border: `1px solid ${color.border}`,
    color: color.textPrimary,
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
  },
};

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "#16a34a";
  if (status >= 400) return "#dc2626";
  return color.textSecondary;
}

/**
 * Minimal "try it out" panel for OpenAPI HTTP operations, filling the
 * `openapi.operation.tab` slot — apiuikit gives it the operation panel's
 * entire body while its tab is selected, so it renders its content directly
 * rather than owning its own open/collapse toggle. The slot only hands us
 * `document` + `method`/`path` — this plugin owns resolving the operation,
 * its parameters/requestBody/security, and turning that into a request,
 * exactly like a plugin author working from the raw document would.
 * `buildHarRequest` (the same builder `CodeSamples` uses for code-sample
 * generation) still does the server-URL templating, auth placeholders, and
 * query/path resolution once we've located the operation.
 */
function TryItOutPanel({ document, method, path }: OpenAPIOperationActionsContext) {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const operation = useMemo(() => document.paths?.[path]?.[method], [document, path, method]);

  const parameters = operation?.parameters ?? [];
  const security = operation?.security ?? document.security ?? [];
  const requestBody = operation?.requestBody;
  const bodyContentType = requestBody?.content ? Object.keys(requestBody.content)[0] : undefined;

  if (!operation) return null;

  function valueFor(param: OpenAPIParameterData): string {
    const key = paramKey(param);
    if (key in paramValues) return paramValues[key];
    return param.example !== undefined ? String(param.example) : "";
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      // Feed typed-in values back through the same `example` precedence
      // buildHarRequest already reads, so a blank field still falls back to
      // the operation's own declared example/enum/placeholder token.
      const resolvedParameters = parameters.map((param) => {
        const typed = paramValues[paramKey(param)];
        return typed ? { ...param, example: typed } : param;
      });

      const hasBody = !!bodyContentType && bodyText.trim().length > 0;
      const harRequest = buildHarRequest({
        method,
        path,
        servers: document.servers,
        parameters: resolvedParameters,
        security,
        securitySchemes: document.components?.securitySchemes,
        media: bodyContentType ? { contentType: bodyContentType } : null,
        resolvedBodyValue: hasBody ? JSON.parse(bodyText) : undefined,
      });

      const url = new URL(harRequest.url);
      for (const entry of harRequest.queryString) url.searchParams.set(entry.name, entry.value);

      const headers: Record<string, string> = {};
      for (const entry of harRequest.headers) headers[entry.name] = entry.value;

      const response = await fetch(url.toString(), {
        method: harRequest.method,
        headers,
        body: harRequest.postData?.text,
      });
      const text = await response.text();

      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        body: text,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.panel}>
      {parameters.map((param) => (
        <div key={paramKey(param)} style={styles.field}>
          <label style={styles.label} htmlFor={`tryitout-${paramKey(param)}`}>
            {param.name} ({param.in}
            {param.required ? ", required" : ""})
          </label>
          <input
            id={`tryitout-${paramKey(param)}`}
            style={styles.input}
            value={valueFor(param)}
            placeholder={param.name}
            onChange={(event) =>
              setParamValues((prev) => ({ ...prev, [paramKey(param)]: event.target.value }))
            }
          />
        </div>
      ))}

      {bodyContentType && (
        <div style={styles.field}>
          <label style={styles.label} htmlFor="tryitout-body">
            Body ({bodyContentType})
          </label>
          <textarea
            id="tryitout-body"
            style={styles.textarea}
            value={bodyText}
            placeholder="{}"
            onChange={(event) => setBodyText(event.target.value)}
          />
        </div>
      )}

      <button type="button" style={styles.send} onClick={handleSend} disabled={sending}>
        {sending ? "Sending…" : "Send"}
      </button>

      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}

      {result && (
        <div>
          <p style={{ ...styles.label, color: statusColor(result.status) }}>
            {result.status} {result.statusText}
          </p>
          <pre style={styles.result}>{result.body}</pre>
        </div>
      )}
    </div>
  );
}

export default definePlugin({
  name: "playground-try-it-out",
  slots: {
    "openapi.operation.tab": { label: "Try it", component: TryItOutPanel },
  },
});
