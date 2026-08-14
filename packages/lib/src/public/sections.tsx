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
import SchemasContainer from "../containers/Schema/Schemas";
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
  /** Only applied when this section sets up its own context (standalone). When
   * composed under <AsyncAPIProvider>, that provider's own `plugins` apply. */
  plugins?: ApiuikitPlugin[];
  /**
   * `"columns"` (default) — reserved right gutter at large breakpoints.
   * `"stacked"` — full-width single column; no prose max-width and no empty
   * side space. For Info/Servers, side content stacks below the main content.
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

export function Servers({ layout, ...providerProps }: SectionProps) {
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

export function Operations({ layout, ...providerProps }: SectionProps) {
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

export function Messages({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <MessagesBody layout={layout} />
    </SectionRoot>
  );
}

// --- Schemas ---------------------------------------------------------------

function SchemasBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  return <SchemasContainer schemas={document.components?.schemas ?? {}} layout={layout} />;
}

export function Schemas({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <SchemasBody layout={layout} />
    </SectionRoot>
  );
}

// --- Info ------------------------------------------------------------------

function InfoBody({ layout }: { layout?: SectionLayout }) {
  const document = useDocument();
  if (!document.info) return null;
  return <Information {...document.info} layout={layout} />;
}

export function Info({ layout, ...providerProps }: SectionProps) {
  return (
    <SectionRoot {...providerProps}>
      <InfoBody layout={layout} />
    </SectionRoot>
  );
}
