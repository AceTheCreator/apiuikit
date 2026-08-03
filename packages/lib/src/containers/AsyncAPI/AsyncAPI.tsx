import { useEffect, useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { containsRefs, resolveDocument } from "../../helpers/resolveDocument";
import { AsyncAPIDocumentData } from "../../types/schema";
import Layout from "./Layout";

export interface IAsyncAPIProps {
  /** A pre-resolved AsyncAPI 3.0 document object, or one that still contains `$ref`s. */
  asyncapi: AsyncAPIDocumentData;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Promise that `asyncapi` is already fully dereferenced upstream. Verified rather than trusted: `$ref`s left in place are still resolved either way, with a console warning that the promise was false. */
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

  // kind="resolved" is a verified promise, not a fast path. Normalization
  // alone (asyncapi !== raw) is not proof it was false: parser output
  // legitimately gets its recursive-schema cycles cut here too, so only
  // leftover $ref nodes count as a broken promise worth reporting.
  const kind = props.kind;
  useEffect(() => {
    if (kind === "resolved" && asyncapi !== raw && containsRefs(raw)) {
      console.warn(
        '[apiuikit] <AsyncAPI kind="resolved"> received a document that still contains $ref nodes. ' +
          "They were resolved anyway; fix the upstream resolution or drop the kind prop.",
      );
    }
  }, [kind, raw, asyncapi]);

  const config = props.config ?? defaultConfig;
  return <Layout asyncapi={asyncapi} config={config} />;
};

export default AsyncAPI;
