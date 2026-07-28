import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAsyncAPIDocument } from "../contexts";
import { AsyncAPIDocumentProvider } from "../containers/AsyncAPI/AsyncAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import { AsyncAPIDocumentData } from "../types/schema";
import { MessageObject } from "../types/asyncapi/MessageObject";
import ServersContainer from "../containers/Server/Servers";
import OperationsContainer from "../containers/Operation/Operations";
import MessagesContainer from "../containers/Messages/Messages";
import SchemasContainer from "../containers/Schema/Schemas";
import Information from "../containers/Information/Information";
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
 *       <Operations document={doc} />
 *   - Composed: render several under one <AsyncAPIProvider> (resolves once,
 *     shares context); sections then read from it and their own `document`
 *     prop is unnecessary.
 *       <AsyncAPIProvider document={doc}>
 *         <Servers /> <Operations />
 *       </AsyncAPIProvider>
 */

export interface SectionProps {
  /** The AsyncAPI document. Required standalone; unnecessary (and ignored)
   * when rendered inside <AsyncAPIProvider> or <AsyncAPI>. */
  document?: AsyncAPIDocumentData;
  /** Only applied when this section sets up its own context (standalone). When
   * composed under a provider, config comes from that provider. */
  config?: ConfigInterface;
}

/**
 * Provider that resolves a document once and shares it with any section
 * components rendered inside: the composition entry point.
 */
export function AsyncAPIProvider({
  document,
  config,
  children,
}: {
  /** The AsyncAPI document to resolve and share with sections inside. */
  document: AsyncAPIDocumentData;
  /** UI configuration (theme, schema expansion defaults) shared with sections inside. */
  config?: ConfigInterface;
  /** Section components (or your own), rendered with access to the shared document context. */
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveDocument(document), [document]);
  return (
    <AsyncAPIDocumentProvider document={resolved} config={config}>
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
const SectionRoot = createSectionRoot(AsyncAPIDocumentProvider, "AsyncAPI");

/** The context's `document` is typed loosely (Record<string, unknown>); the
 * sections need the structured shape, exactly as Layout casts it. */
function useDocument(): AsyncAPIDocumentData {
  return useAsyncAPIDocument().document as AsyncAPIDocumentData;
}

// --- Servers ---------------------------------------------------------------

function ServersBody() {
  const document = useDocument();
  if (!document.servers || Object.keys(document.servers).length === 0) return null;
  return <ServersContainer servers={document.servers} />;
}

export function Servers(props: SectionProps) {
  return (
    <SectionRoot {...props}>
      <ServersBody />
    </SectionRoot>
  );
}

// --- Operations ------------------------------------------------------------

function OperationsBody() {
  const document = useDocument();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <OperationsContainer
      operations={document.operations ?? {}}
      selectedKey={selectedKey}
      onSelectKey={setSelectedKey}
    />
  );
}

export function Operations(props: SectionProps) {
  return (
    <SectionRoot {...props}>
      <OperationsBody />
    </SectionRoot>
  );
}

// --- Messages --------------------------------------------------------------

function MessagesBody() {
  const document = useDocument();
  return (
    <MessagesContainer
      messages={(document.components?.messages ?? {}) as Record<string, MessageObject>}
    />
  );
}

export function Messages(props: SectionProps) {
  return (
    <SectionRoot {...props}>
      <MessagesBody />
    </SectionRoot>
  );
}

// --- Schemas ---------------------------------------------------------------

function SchemasBody() {
  const document = useDocument();
  return <SchemasContainer schemas={document.components?.schemas ?? {}} />;
}

export function Schemas(props: SectionProps) {
  return (
    <SectionRoot {...props}>
      <SchemasBody />
    </SectionRoot>
  );
}

// --- Info ------------------------------------------------------------------

function InfoBody() {
  const document = useDocument();
  if (!document.info) return null;
  return <Information {...document.info} />;
}

export function Info(props: SectionProps) {
  return (
    <SectionRoot {...props}>
      <InfoBody />
    </SectionRoot>
  );
}
