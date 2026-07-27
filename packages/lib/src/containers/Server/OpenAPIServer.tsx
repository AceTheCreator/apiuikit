import Markdown from "../../components/Markdown";
import { ChannelAddress } from "../../components/ChannelAddress";
import IconLink from "../../icons/Link";
import type { Parameter } from "../../types/asyncapi/Parameter";
import { OpenAPIServerData, OpenAPIServerVariableData } from "../../types/openapi";

type OpenAPIServerProps = OpenAPIServerData & {
  serverKey?: string;
};

export default function OpenAPIServer({ url, description, variables, serverKey }: OpenAPIServerProps) {
  const variableEntries = variables as Record<string, OpenAPIServerVariableData> | undefined;

  return (
    <div>
      <div className="font-bold text-foreground-secondary mt-8 mb-4 bg-neutral-200 border border-neutral-500 p-4 rounded-lg">
        <div className="border border-dotted border-black p-2 rounded-lg bg-surface">
          <IconLink className="inline-block mr-1 -mt-1 h-6 text-foreground-muted" />
          {url && (
            <ChannelAddress
              address={url}
              parameters={variableEntries as unknown as Record<string, Parameter>}
              className="font-bold leading-tight tracking-tight px-0"
            />
          )}
        </div>
      </div>
      {description && <Markdown>{description}</Markdown>}
      {variableEntries && Object.keys(variableEntries).length > 0 && (
        <div id={serverKey ? `server-${serverKey}-variables` : undefined} className="mt-6">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
            Server Variables
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Default</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-foreground-muted uppercase">Allowed values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(variableEntries).map(([name, variable]) => (
                  <tr key={name}>
                    <td className="px-4 py-2 font-mono text-foreground-secondary">{name}</td>
                    <td className="px-4 py-2 font-mono text-foreground-secondary">{variable.default}</td>
                    <td className="px-4 py-2 text-foreground-secondary">
                      {variable.enum?.join(", ") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
