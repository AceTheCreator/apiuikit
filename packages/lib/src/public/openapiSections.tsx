import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useDocumentContext } from "../contexts";
import { OpenAPIDocumentProvider } from "../containers/OpenAPI/OpenAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import { OpenAPIDocumentData } from "../types/openapi";
import OpenAPIServersContainer from "../containers/Server/OpenAPIServers";
import PathsContainer from "../containers/Path/Paths";
import SchemasContainer from "../containers/Schema/Schemas";
import OpenAPIInformation from "../containers/Information/OpenAPIInformation";
import { createSectionRoot } from "./createSectionRoot";

/**
 * Standalone, composable OpenAPI section components — mirrors public/sections.tsx
 * (AsyncAPI). Each renders one part of an OpenAPI document (servers, endpoints,
 * schemas, info) on its own, dual-mode:
 *   - Standalone: <OpenAPIEndpoints document={doc} />
 *   - Composed: <OpenAPIProvider document={doc}><OpenAPIServers /><OpenAPIEndpoints /></OpenAPIProvider>
 */

export interface OpenAPISectionProps {
  /** The OpenAPI document. Required standalone; unnecessary (and ignored) when rendered inside <OpenAPIProvider>. */
  document?: OpenAPIDocumentData;
  config?: ConfigInterface;
}

export function OpenAPIProvider({
  document,
  config,
  children,
}: {
  document: OpenAPIDocumentData;
  config?: ConfigInterface;
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveDocument(document), [document]);
  return (
    <OpenAPIDocumentProvider document={resolved} config={config}>
      {children}
    </OpenAPIDocumentProvider>
  );
}

/** Shared with public/sections.tsx via createSectionRoot — see that file's doc for the details. */
const SectionRoot = createSectionRoot(OpenAPIDocumentProvider, "OpenAPI", "openapi");

function useDocument(): OpenAPIDocumentData {
  const context = useDocumentContext();
  // The specType check narrows `document` to the OpenAPI shape. The cast on
  // the other branch covers only the mis-nested case (an OpenAPI section
  // under an AsyncAPI provider, already warned about by SectionRoot), where
  // returning the wrong-shaped document renders empty instead of crashing.
  return context.specType === "openapi"
    ? context.document
    : (context.document as unknown as OpenAPIDocumentData);
}

// --- Servers ---------------------------------------------------------------

function OpenAPIServersBody() {
  const document = useDocument();
  if (!document.servers || document.servers.length === 0) return null;
  return <OpenAPIServersContainer servers={document.servers} />;
}

export function OpenAPIServers(props: OpenAPISectionProps) {
  return (
    <SectionRoot {...props}>
      <OpenAPIServersBody />
    </SectionRoot>
  );
}

// --- Endpoints ---------------------------------------------------------------

function OpenAPIEndpointsBody() {
  const document = useDocument();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <PathsContainer
      paths={document.paths ?? {}}
      security={document.security}
      securitySchemes={document.components?.securitySchemes}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
    />
  );
}

export function OpenAPIEndpoints(props: OpenAPISectionProps) {
  return (
    <SectionRoot {...props}>
      <OpenAPIEndpointsBody />
    </SectionRoot>
  );
}

// --- Webhooks ----------------------------------------------------------------

function OpenAPIWebhooksBody() {
  const document = useDocument();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const webhooks = document.webhooks ?? {};
  if (Object.keys(webhooks).length === 0) return null;
  return (
    <PathsContainer
      paths={webhooks}
      security={document.security}
      securitySchemes={document.components?.securitySchemes}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      columnLabel="Webhook"
      idPrefix="webhook"
    />
  );
}

/** OpenAPI 3.1 `webhooks`. Renders nothing for a document that declares none. */
export function OpenAPIWebhooks(props: OpenAPISectionProps) {
  return (
    <SectionRoot {...props}>
      <OpenAPIWebhooksBody />
    </SectionRoot>
  );
}

// --- Schemas ---------------------------------------------------------------

function OpenAPISchemasBody() {
  const document = useDocument();
  return <SchemasContainer schemas={document.components?.schemas ?? {}} />;
}

export function OpenAPISchemas(props: OpenAPISectionProps) {
  return (
    <SectionRoot {...props}>
      <OpenAPISchemasBody />
    </SectionRoot>
  );
}

// --- Info --------------------------------------------------------------------

function OpenAPIInfoBody() {
  const document = useDocument();
  if (!document.info) return null;
  return <OpenAPIInformation info={document.info} tags={document.tags} externalDocs={document.externalDocs} />;
}

export function OpenAPIInfo(props: OpenAPISectionProps) {
  return (
    <SectionRoot {...props}>
      <OpenAPIInfoBody />
    </SectionRoot>
  );
}
