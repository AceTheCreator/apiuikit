import { SchemaTab } from "../../components/schema";
import Markdown from "../../components/Markdown";
import MethodBadge from "../../components/MethodBadge";
import IconExternalLink from "../../icons/ExternalLink";
import { ChannelAddress } from "../../components/ChannelAddress";
import { PARAMETER_GROUPS } from "../../contants";
import {
  HttpMethod,
  OpenAPIOperationData,
  OpenAPIParameterData,
} from "../../types/openapi";

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
}

export default function PathOperation({ method, path, op, id, globalSecurity }: PathOperationProps) {
  const parameters = op.parameters ?? [];
  const security = op.security ?? globalSecurity ?? [];
  const responses = op.responses ?? {};
  const requestBodyContent = op.requestBody?.content ?? {};

  return (
    <div className="space-y-6" id={`endpoint-${id}-detail`}>
      <div className="flex items-center gap-2">
        <MethodBadge method={method} />
        <ChannelAddress address={path} className="text-sm font-mono" />
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
          <div className="flex flex-wrap gap-1.5">
            {security.flatMap((requirement, i) =>
              Object.entries(requirement).map(([schemeName, scopes]) => (
                <span
                  key={`${i}-${schemeName}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-foreground-secondary"
                  title={scopes.length ? `Scopes: ${scopes.join(", ")}` : undefined}
                >
                  {schemeName}
                  {scopes.length > 0 ? ` (${scopes.join(", ")})` : ""}
                </span>
              )),
            )}
          </div>
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
          <div className="space-y-4">
            {Object.entries(responses).map(([status, response]) => {
              const content = response.content ?? {};
              const mediaTypes = Object.entries(content);
              return (
                <div key={status} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                        status.startsWith("2")
                          ? "bg-green-100 text-green-800"
                          : status.startsWith("4") || status.startsWith("5")
                            ? "bg-red-100 text-red-800"
                            : "bg-neutral-100 text-foreground-secondary"
                      }`}
                    >
                      {status}
                    </span>
                    {response.description && (
                      <span className="text-sm text-foreground-secondary">{response.description}</span>
                    )}
                  </div>
                  {mediaTypes.length > 0 ? (
                    mediaTypes.map(([mediaType, media]) => (
                      <SchemaTab
                        key={mediaType}
                        schema={media.schema ?? {}}
                        label={`Body (${mediaType})`}
                        rootName="Body"
                      />
                    ))
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
