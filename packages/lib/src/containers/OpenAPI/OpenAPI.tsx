import { useMemo } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { resolveDocument } from "../../helpers/resolveDocument";
import { OpenAPIDocumentData } from "../../types/openapi";
import Layout from "./Layout";

export interface IOpenAPIProps {
  /** A pre-resolved OpenAPI 3.0/3.1 document object, or one that still contains `$ref`s. */
  openapi: OpenAPIDocumentData;
  /** UI configuration: theme, which sections to show, sidebar options, and more. */
  config?: ConfigInterface;
  /** Informational hint that `openapi` has already been fully dereferenced upstream, not a contract: `$ref`s left in place are still resolved either way. */
  kind?: "resolved";
}

/**
 * Renders a full OpenAPI documentation page: sidebar navigation, search,
 * servers, endpoints, and schemas. Pass a pre-resolved (or `$ref`-carrying)
 * document object; for raw YAML/JSON strings, use `OpenAPIRenderer` instead,
 * which parses first.
 */
const OpenAPI = (props: IOpenAPIProps) => {
  const raw = props.openapi;
  // Always resolve: documents without $refs (including `kind: "resolved"`
  // parser output) pass through resolveDocument's cheap scan untouched,
  // identity preserved, no copy, while documents that still carry refs get
  // inlined even if the caller wrongly promised they were pre-resolved.
  const openapi = useMemo(() => resolveDocument(raw), [raw]);
  const config = props.config ?? defaultConfig;
  return <Layout openapi={openapi} config={config} />;
};

export default OpenAPI;
