import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useDocumentContext } from "../contexts";
import { OpenAPIDocumentProvider } from "../containers/OpenAPI/OpenAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";
import { OpenAPIDocumentData } from "../types/openapi";
import OpenAPIServersContainer from "../containers/Server/OpenAPIServers";
import PathsContainer from "../containers/Path/Paths";
import OpenAPIInformation from "../containers/Information/OpenAPIInformation";
import type { SectionLayout } from "../components/Section";
import { createSectionRoot } from "./createSectionRoot";

/**
 * Standalone, composable OpenAPI section components — mirrors public/sections.tsx
 * (AsyncAPI). Each renders one part of an OpenAPI document (servers, endpoints,
 * schemas, info) on its own, dual-mode:
 *   - Standalone: <OpenAPIEndpoints document={doc} />
 *   - Composed: <OpenAPIProvider document={doc}><OpenAPIServers /><OpenAPIEndpoints /></OpenAPIProvider>
 */

export interface OpenAPISectionProps {
  /**
   * The parsed OpenAPI JSON, for example a JSON file you imported.
   * Pass it when this component is on the page by itself.
   * Inside OpenAPIProvider, the document comes from there, and a value passed here is ignored.
   */
  document?: OpenAPIDocumentData;
  /**
   * Theme and display options, such as schema expansion.
   * Used when this component loads the document itself.
   * Inside OpenAPIProvider, set `config` on the provider.
   */
  config?: ConfigInterface;
  /**
   * Plugins for this component.
   * Used when this component loads the document itself.
   * Inside OpenAPIProvider, set `plugins` on the provider.
   */
  plugins?: ApiuikitPlugin[];
  /**
   * `columns` (the default) leaves an empty column on the right so this section
   * lines up with Info and Servers.
   * `stacked` uses the full width; choose it when the section is on the page by itself.
   * For Info and Servers, `stacked` also moves the side content below the main content.
   */
  layout?: SectionLayout;
}

export function OpenAPIProvider({
  document,
  config,
  plugins,
  children,
}: {
  document: OpenAPIDocumentData;
  config?: ConfigInterface;
  /** Third-party plugins shared with sections inside. */
  plugins?: ApiuikitPlugin[];
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveDocument(document), [document]);
  return (
    <OpenAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
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

function OpenAPIServersBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  if (!document.servers || document.servers.length === 0) return null;
  return <OpenAPIServersContainer servers={document.servers} layout={layout} />;
}

/**
 * The servers an OpenAPI document can call. Choose a server to see its URL,
 * description, and variables.
 *
 * On its own, pass `document`. With other sections, render it inside
 * OpenAPIProvider and pass `document` to the provider instead.
 */
export function OpenAPIServers({ layout, ...providerProps }: OpenAPISectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <OpenAPIServersBody layout={layout} />
    </SectionRoot>
  );
}

// --- Endpoints ---------------------------------------------------------------

function OpenAPIEndpointsBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <PathsContainer
      paths={document.paths ?? {}}
      security={document.security}
      securitySchemes={document.components?.securitySchemes}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      layout={layout}
    />
  );
}

/**
 * A table of every endpoint in an OpenAPI document. Each row shows the path
 * and HTTP method. Click a row to open a panel with the parameters, request
 * body, responses, and security.
 *
 * On its own, pass `document`. With other sections, render it inside
 * OpenAPIProvider and pass `document` to the provider instead.
 */
export function OpenAPIEndpoints({ layout, ...providerProps }: OpenAPISectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <OpenAPIEndpointsBody layout={layout} />
    </SectionRoot>
  );
}

// --- Webhooks ----------------------------------------------------------------

function OpenAPIWebhooksBody({ layout }: { layout?: SectionLayout }) {
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
      layout={layout}
    />
  );
}

/**
 * A table of the webhooks an OpenAPI document receives. Each row is one
 * webhook. Click a row to open a panel with its parameters, body, and
 * responses. A document with no webhooks shows nothing here.
 *
 * On its own, pass `document`. With other sections, render it inside
 * OpenAPIProvider and pass `document` to the provider instead.
 */
export function OpenAPIWebhooks({ layout, ...providerProps }: OpenAPISectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <OpenAPIWebhooksBody layout={layout} />
    </SectionRoot>
  );
}

// --- Schemas ---------------------------------------------------------------
// Lives in ./schemasSection as the spec-agnostic `Schemas`: its document shape
// and rendering are identical for both specs, so there is only one component.

// --- Info --------------------------------------------------------------------

function OpenAPIInfoBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  if (!document.info) return null;
  return (
    <OpenAPIInformation
      info={document.info}
      tags={document.tags}
      externalDocs={document.externalDocs}
      layout={layout}
    />
  );
}

/**
 * The title, description, and version of an OpenAPI document, with license,
 * contact, tags, and external docs beside it.
 *
 * On its own, pass `document`. With other sections, render it inside
 * OpenAPIProvider and pass `document` to the provider instead.
 */
export function OpenAPIInfo({ layout, ...providerProps }: OpenAPISectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <OpenAPIInfoBody layout={layout} />
    </SectionRoot>
  );
}
