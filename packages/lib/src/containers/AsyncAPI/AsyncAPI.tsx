import { useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { resolveDocument } from "../../helpers/resolveDocument";
import { AsyncAPIDocumentData } from "../../types/schema";
import Layout from "./Layout";

export interface IAsyncAPIProps {
  /** A pre-resolved AsyncAPI 3.0 document object, or one that still contains `$ref`s. */
  asyncapi: AsyncAPIDocumentData;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Informational hint that `asyncapi` has already been fully dereferenced upstream, not a contract: `$ref`s left in place are still resolved either way. */
  kind?: "resolved";
}

/**
 * Renders a full AsyncAPI documentation page: sidebar navigation, search,
 * servers, operations, messages, and schemas. Pass a pre-resolved (or
 * `$ref`-carrying) document object; for raw YAML/JSON strings, use
 * `AsyncAPIRenderer` instead, which parses first.
 */
const AsyncAPI = (props: IAsyncAPIProps) => {
  const raw = props.asyncapi;
  // Always normalize: documents already meeting resolveDocument's contract
  // (no $refs, no object cycles) pass through its cheap scan untouched,
  // identity preserved, no copy. Documents that still carry refs get inlined
  // even if the caller wrongly promised they were pre-resolved, and parser
  // output with real object cycles (recursive schemas) gets those cycles cut
  // back into `$ref` nodes.
  const asyncapi = useMemo(() => resolveDocument(raw), [raw]);
  const config = props.config ?? defaultConfig;
  return <Layout asyncapi={asyncapi} config={config} />;
};

export default AsyncAPI;
