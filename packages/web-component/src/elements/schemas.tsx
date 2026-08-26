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

// One element for both spec types: `components.schemas` is the exact same
// `Record<string, SchemaNodeData>` shape on AsyncAPIDocumentData and
// OpenAPIDocumentData (openapi.ts imports SchemaNodeData from schema.ts
// directly), and apiuikit's `Schemas`/`OpenAPISchemas` section components
// are two names wrapping the identical underlying container — they only
// differ in which document provider's context they set up, which this
// section doesn't otherwise read. The cast below is safe because `Schemas`
// only ever reads `document.components?.schemas`.
export function SchemasElement({ spec, config, layout }: SchemasElementProps) {
  if (!spec) return null;
  return <Schemas document={spec as AsyncAPIDocumentData} config={config} layout={layout} />;
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
