import { useEffect, useId, useState } from "react";
import Markdown from "../../components/Markdown";
import IconLink from "../../icons/Link";
import IconShieldCheck from "../../icons/ShieldCheck";
import IconArrowRight from "../../icons/ArrowRight";
import IconDownRight from "../../icons/ArrowDown";
import { ChannelAddress } from "../../components/ChannelAddress";
import { Server as ServerInterface } from "../../types/asyncapi/Server";
import { ServerVariable } from "../../types/asyncapi/ServerVariable";
import { Tag as TagType } from "../../types/asyncapi/Tag";
import { ExternalDocs } from "../../types/asyncapi/ExternalDocs";
import { ServerBindingsObject } from "../../types/asyncapi/ServerBindingsObject";
import Authorization from "../../components/Authorization";
import Tag from "../../components/Tag";
import Connection from "../../icons/Connection";
import Bindings from "../../components/Bindings";

interface ServerProps extends ServerInterface {
  /** The server's own key/name, needed to build ids for its sub-sections. */
  serverKey?: string;
  /** Which collapsed section (if any) search navigated to, e.g. `binding:kafka`. */
  focusSection?: string | null;
}

export default function Server({
  host,
  protocol,
  description,
  tags,
  variables,
  security,
  bindings,
  serverKey,
  focusSection = null,
}: ServerProps) {
  // `variables` is typed as a Map (a codegen artifact from the AsyncAPI JSON schema),
  // but parsed documents are always plain objects at runtime — never real Map instances.
  const variableEntries = variables as unknown as Record<string, ServerVariable> | undefined;
  const [authExpanded, setAuthExpanded] = useState(false);
  const authHeadingId = useId();
  const authPanelId = useId();

  // Mirrors MessageRow's auto-expand-on-select: navigating here specifically
  // for the Authorization content shouldn't leave it hidden.
  useEffect(() => {
    if (focusSection === "security") setAuthExpanded(true);
  }, [focusSection]);

  return (
    <div>
      <div className="font-bold text-foreground-secondary mt-8 mb-4 bg-neutral-200 border border-neutral-500 p-4 rounded-lg">
        <div className="border border-dotted border-black p-2 rounded-lg bg-surface">
          <IconLink className="inline-block mr-1 -mt-1 h-6 text-foreground-muted" />
          {host && <ChannelAddress address={host} parameters={variableEntries} className="font-bold leading-tight tracking-tight px-0" />}
        </div>
        <div className="mt-2">
          {tags &&
            tags.map((tag, index) => {
              const t = tag as TagType;
              const extDocs = t.externalDocs as ExternalDocs | undefined;
              return (
                <Tag
                  key={index}
                  href={extDocs && extDocs.url}
                  title={
                    t.description ||
                    (extDocs && extDocs.description
                      ? extDocs.description
                      : undefined)
                  }
                  name={t.name}
                />
              );
            })}
        </div>
      </div>
      <Markdown>{description}</Markdown>
      {security && security.length > 0 && (
        <div id={serverKey ? `server-${serverKey}-security` : undefined}>
          <h3 id={authHeadingId} className="font-bold text-foreground-secondary mt-8">
            <IconShieldCheck className="inline-block mr-2 -mt-1 h-6 text-foreground-muted" />
            Authorization
          </h3>
          <p className="prose text-foreground-muted mt-4">
            This server accepts the following authorization mechanism{security.length > 1 ? "s" : ""}:
          </p>
          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              aria-expanded={authExpanded}
              aria-controls={authPanelId}
              aria-labelledby={authHeadingId}
              onClick={() => setAuthExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 bg-neutral-50 text-left hover:bg-neutral-100 transition-colors"
            >
              <span className="text-xs font-normal text-foreground-muted bg-neutral-100 border border-border rounded-full px-2 py-0.5">
                {security.length}
              </span>
              {authExpanded ? (
                <IconDownRight className="w-4 h-4 text-foreground-muted shrink-0" />
              ) : (
                <IconArrowRight className="w-4 h-4 text-foreground-muted shrink-0" />
              )}
            </button>
            <div
              id={authPanelId}
              className={`grid transition-all duration-200 ease-in-out ${authExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="px-4 py-2 border-t border-border">
                  <Authorization securities={security} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {(() => {
        const protocolBinding = (bindings as ServerBindingsObject)?.[protocol as keyof ServerBindingsObject] as Record<string, unknown> | undefined;
        const hasContent = protocolBinding && Object.keys(protocolBinding).some((k) => k !== "bindingVersion");
        if (!hasContent) return null;
        return (
          <div id={serverKey ? `server-${serverKey}-bindings` : undefined}>
            <h3 className="font-bold text-foreground-secondary mt-8">
              <Connection className="inline-block mr-2 -mt-1 h-6 text-foreground-muted" />
              Connection Settings
            </h3>
            <p className="prose text-foreground-muted mt-4">
              This server accepts the following connection configuration:
            </p>
            <Bindings
              bindings={protocolBinding}
              protocol={protocol}
              focused={focusSection === `binding:${protocol}`}
            />
          </div>
        );
      })()}
    </div>
  );
}
