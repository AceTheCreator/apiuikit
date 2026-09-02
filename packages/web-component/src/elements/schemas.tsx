import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Schemas } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface SchemasElementProps {
  spec?: AsyncAPIDocumentData | OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

// One element for both spec types, backed by apiuikit's spec-agnostic
// `Schemas` section: `components.schemas` is the exact same
// `Record<string, SchemaNodeData>` shape on AsyncAPIDocumentData and
// OpenAPIDocumentData (openapi.ts imports SchemaNodeData from schema.ts
// directly).
export function SchemasElement({ spec, config, layout }: SchemasElementProps) {
  if (!spec) return null;
  return <Schemas document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-schemas",
  r2wc(SchemasElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
