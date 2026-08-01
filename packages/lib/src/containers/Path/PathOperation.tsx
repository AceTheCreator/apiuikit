import { useState } from "react";
import { SchemaTab } from "../../components/schema";
import Markdown from "../../components/Markdown";
import Authorization from "../../components/Authorization";
import CollapsiblePanel from "../../components/CollapsiblePanel";
import IconExternalLink from "../../icons/ExternalLink";
import IconShieldCheck from "../../icons/ShieldCheck";
import { PARAMETER_GROUPS } from "../../contants";
import {
  HttpMethod,
  OpenAPIOperationData,
  OpenAPIParameterData,
  OpenAPIResponseData,
  OpenAPISecuritySchemeData,
} from "../../types/openapi";

function statusBadgeClassName(status: string): string {
  if (status.startsWith("2")) return "bg-green-100 text-green-800";
  if (status.startsWith("4") || status.startsWith("5")) return "bg-red-100 text-red-800";
  return "bg-neutral-100 text-foreground-secondary";
}

// Mirrors Reply's own request/reply tab strip (folder-style tabs sitting
// directly on top of a shared content panel) — one tab per response status,
// instead of stacking every status as its own bordered card.
function ResponseTabs({ responses }: { responses: Record<string, OpenAPIResponseData> }) {
  const statuses = Object.keys(responses);
  const [status, setStatus] = useState(statuses[0]);
  const response = responses[status];
  const mediaTypes = Object.entries(response?.content ?? {});

  return (
    <div>
      <div className="flex items-end gap-0.5 -ml-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-t-md transition-colors ${
              status === s
                ? "bg-neutral-100 border border-b-0 border-border"
                : "hover:bg-neutral-50"
            }`}
          >
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${statusBadgeClassName(s)}`}>
              {s}
            </span>
          </button>
        ))}
      </div>

      <div className="-mx-5 px-5 py-4 bg-neutral-100 border-t border-border min-h-32">
        {response?.description && (
          <p className="text-sm text-foreground-secondary mb-3">{response.description}</p>
        )}
        {mediaTypes.length > 0 ? (
          mediaTypes.map(([mediaType, media]) => (
            <SchemaTab
              key={mediaType}
              schema={media.schema ?? {}}
              label={`Body (${mediaType})`}
              rootName="Body"
            />
          ))
        ) : (
          <p className="text-xs text-foreground-muted italic">No response body.</p>
        )}
      </div>
    </div>
  );
}

function ParameterTable({ parameters, location }: { parameters: OpenAPIParameterData[]; location: string }) {
  const rows = parameters.filter((param) => param.in === location);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Name</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Type</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((param) => {
            const schema = param.schema as { type?: string } | undefined;
            return (
              <tr key={param.name}>
                <td className="px-4 py-2 font-mono text-foreground-secondary align-top whitespace-nowrap">
                  {param.name}
                  {param.required && <span className="ml-1 text-red-500">*</span>}
                </td>
                <td className="px-4 py-2 text-foreground-muted align-top whitespace-nowrap">
                  {schema?.type ?? "—"}
                </td>
                <td className="px-4 py-2 text-foreground-secondary align-top">
                  {param.description && <Markdown>{param.description}</Markdown>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface PathOperationProps {
  method: HttpMethod;
  path: string;
  op: OpenAPIOperationData;
  id: string | null;
  /** Falls back to this when the operation doesn't declare its own `security`. */
  globalSecurity?: Array<Record<string, string[]>>;
  /** Scheme definitions (`components.securitySchemes`), resolved by name against `security`'s requirements to render the actual scheme details, not just their names. */
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
}

export default function PathOperation({ op, id, globalSecurity, securitySchemes }: PathOperationProps) {
  const parameters = op.parameters ?? [];
  const security = op.security ?? globalSecurity ?? [];
  const responses = op.responses ?? {};
  const requestBodyContent = op.requestBody?.content ?? {};

  // The requirement list only names schemes + the scopes *this operation*
  // asks for; the scheme definitions themselves (auth flows, key placement,
  // ...) live separately in `components.securitySchemes`. Union the required
  // scopes per scheme name across whatever OR'd requirement entries
  // reference it, so Authorization can show what's actually needed here
  // rather than the scheme's entire scope catalog.
  const requiredScopesByScheme = new Map<string, string[]>();
  for (const requirement of security) {
    for (const [schemeName, scopes] of Object.entries(requirement)) {
      if (scopes.length === 0) continue;
      const existing = requiredScopesByScheme.get(schemeName) ?? [];
      requiredScopesByScheme.set(schemeName, Array.from(new Set([...existing, ...scopes])));
    }
  }

  const resolvedSchemes = Array.from(new Set(security.flatMap((requirement) => Object.keys(requirement))))
    .map((name) => {
      const scheme = securitySchemes?.[name];
      if (!scheme) return null;
      const requiredScopes = requiredScopesByScheme.get(name);
      return requiredScopes ? { ...scheme, requiredScopes } : scheme;
    })
    .filter((scheme): scheme is OpenAPISecuritySchemeData => !!scheme);

  return (
    <div className="space-y-6" id={`endpoint-${id}-detail`}>
      <div className="flex items-center gap-2">
        {op.deprecated && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Deprecated
          </span>
        )}
        {op.externalDocs?.url && (
          <a
            href={op.externalDocs.url}
            target="_blank"
            rel="noreferrer"
            title={op.externalDocs.description || op.externalDocs.url}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-foreground-secondary border border-border hover:bg-neutral-200 transition-colors"
          >
            External Documentation
            <IconExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {op.summary && <p className="text-sm text-foreground-secondary">{op.summary}</p>}
      {op.description && <Markdown>{op.description}</Markdown>}

      {PARAMETER_GROUPS.map(({ location, label }) => (
        <div key={location}>
          {parameters.some((p) => p.in === location) && (
            <>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">{label}</p>
              <ParameterTable parameters={parameters} location={location!} />
            </>
          )}
        </div>
      ))}

      {security.length > 0 && (
        <div id={`endpoint-${id}-security`}>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
            Authorization
          </p>


          {resolvedSchemes.length > 0 && (
            <CollapsiblePanel
              className="mt-3"
              trigger={
                <span className="flex items-center gap-2 text-xs font-normal text-foreground-muted">
                  <IconShieldCheck className="h-4 w-4 text-foreground-muted" />
                  <span className="bg-neutral-100 border border-border rounded-full px-2 py-0.5">
                    {resolvedSchemes.length}
                  </span>
                </span>
              }
            >
              <div className="px-4 py-2 border-t border-border">
                <Authorization securities={resolvedSchemes} />
              </div>
            </CollapsiblePanel>
          )}
        </div>
      )}

      {Object.keys(requestBodyContent).length > 0 && (
        <div>
          {Object.entries(requestBodyContent).map(([mediaType, media]) => (
            <SchemaTab
              key={mediaType}
              schema={media.schema ?? {}}
              label={`Request Body (${mediaType})`}
              rootName="Body "
              description={op.requestBody?.description}
            />
          ))}
        </div>
      )}

      {Object.keys(responses).length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">Responses</p>
          <ResponseTabs responses={responses} />
        </div>
      )}
    </div>
  );
}
