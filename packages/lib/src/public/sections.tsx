import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAsyncAPIDocument } from "../contexts";
import { AsyncAPIDocumentProvider } from "../containers/AsyncAPI/AsyncAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";
import { AsyncAPIDocumentData } from "../types/schema";
import { MessageObject } from "../types/asyncapi/MessageObject";
import ServersContainer from "../containers/Server/Servers";
import OperationsContainer from "../containers/Operation/Operations";
import MessagesContainer from "../containers/Messages/Messages";
import Information from "../containers/Information/Information";
import type { SectionLayout } from "../components/Section";
import { createSectionRoot } from "./createSectionRoot";

/**
 * Standalone, composable section components. Each renders one part of an
 * AsyncAPI document (servers, operations, messages, schemas, info) on its own,
 * so consumers can arrange them in their own layout instead of using the whole
 * `<AsyncAPI>` widget.
 *
 * They're dual-mode:
 *   - Standalone: pass a `document` (and optional `config`); the section
 *     resolves it and sets up its own context.
 *       <AsyncAPIOperations document={doc} />
 *   - Composed: render several under one <AsyncAPIProvider> (resolves once,
 *     shares context); sections then read from it and their own `document`
 *     prop is unnecessary.
 *       <AsyncAPIProvider document={doc}>
 *         <AsyncAPIServers /> <AsyncAPIOperations />
 *       </AsyncAPIProvider>
 */

export interface SectionProps {
  /**
   * The parsed AsyncAPI JSON, for example a JSON file you imported.
   * Pass it when this component is on the page by itself.
   * Inside AsyncAPIProvider or AsyncAPI, the document comes from there, and a value passed here is ignored.
   */
  document?: AsyncAPIDocumentData;
  /**
   * Theme and display options, such as schema expansion.
   * Used when this component loads the document itself.
   * Inside AsyncAPIProvider, set `config` on the provider.
   */
  config?: ConfigInterface;
  /**
   * Plugins for this component.
   * Used when this component loads the document itself.
   * Inside AsyncAPIProvider, set `plugins` on the provider.
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

/**
 * Provider that resolves a document once and shares it with any section
 * components rendered inside: the composition entry point.
 */
export function AsyncAPIProvider({
  document,
  config,
  plugins,
  children,
}: {
  /** The AsyncAPI document to resolve and share with sections inside. */
  document: AsyncAPIDocumentData;
  /** UI configuration (theme, schema expansion defaults) shared with sections inside. */
  config?: ConfigInterface;
  /** Third-party plugins shared with sections inside. */
  plugins?: ApiuikitPlugin[];
  /** Section components (or your own), rendered with access to the shared document context. */
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveDocument(document), [document]);
  return (
    <AsyncAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
      {children}
    </AsyncAPIDocumentProvider>
  );
}

/**
 * Renders `children` inside the ambient document context if there is one
 * (composed mode), otherwise resolves the `document` prop and sets up its own
 * provider (standalone mode). Shared with public/openapiSections.tsx via
 * createSectionRoot — see that file's doc for the details.
 */
const SectionRoot = createSectionRoot(AsyncAPIDocumentProvider, "AsyncAPI", "asyncapi");

function useDocument(): AsyncAPIDocumentData {
  const context = useAsyncAPIDocument();
  // The specType check narrows `document` to the AsyncAPI shape. The cast on
  // the other branch covers only the mis-nested case (an AsyncAPI section
  // under an OpenAPI provider, already warned about by SectionRoot), where
  // returning the wrong-shaped document renders empty instead of crashing.
  return context.specType === "asyncapi"
    ? context.document
    : (context.document as unknown as AsyncAPIDocumentData);
}

// --- Servers ---------------------------------------------------------------

function ServersBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  if (!document.servers || Object.keys(document.servers).length === 0) return null;
  return <ServersContainer servers={document.servers} layout={layout} />;
}

/**
 * The servers an AsyncAPI document can connect to. Choose a server to see its
 * host, protocol, variables, and security.
 *
 * On its own, pass `document`. With other sections, render it inside
 * AsyncAPIProvider and pass `document` to the provider instead.
 */
export function AsyncAPIServers({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <ServersBody layout={layout} />
    </SectionRoot>
  );
}

// --- Operations ------------------------------------------------------------

function OperationsBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <OperationsContainer
      operations={document.operations ?? {}}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
      layout={layout}
    />
  );
}

/**
 * A table of every operation in an AsyncAPI document. Each row shows the
 * channel and whether the operation sends or receives. Click a row to open a
 * panel with the description, messages, security, bindings, and reply.
 *
 * On its own, pass `document`. With other sections, render it inside
 * AsyncAPIProvider and pass `document` to the provider instead.
 */
export function AsyncAPIOperations({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <OperationsBody layout={layout} />
    </SectionRoot>
  );
}

// --- Messages --------------------------------------------------------------

function MessagesBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  return (
    <MessagesContainer
      messages={(document.components?.messages ?? {}) as Record<string, MessageObject>}
      layout={layout}
    />
  );
}

/**
 * A table of the messages in an AsyncAPI document. Each row shows the message
 * name and summary. Expand a row to see its payload and headers.
 *
 * On its own, pass `document`. With other sections, render it inside
 * AsyncAPIProvider and pass `document` to the provider instead.
 */
export function AsyncAPIMessages({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <MessagesBody layout={layout} />
    </SectionRoot>
  );
}

// --- Schemas ---------------------------------------------------------------
// Lives in ./schemasSection as the spec-agnostic `Schemas`: its document shape
// and rendering are identical for both specs, so there is only one component.

// --- Info ------------------------------------------------------------------

function InfoBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  if (!document.info) return null;
  return <Information {...document.info} layout={layout} />;
}

/**
 * The title, description, and version of an AsyncAPI document, with license,
 * contact, and external docs beside it.
 *
 * On its own, pass `document`. With other sections, render it inside
 * AsyncAPIProvider and pass `document` to the provider instead.
 */
export function AsyncAPIInfo({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <InfoBody layout={layout} />
    </SectionRoot>
  );
}
