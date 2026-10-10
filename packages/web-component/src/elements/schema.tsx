import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Schema } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface SchemaElementProps {
  spec?: AsyncAPIDocumentData | OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
  name?: string;
}

// Like <apiuikit-schemas>, one element for both spec types.
export function SchemaElement({ spec, config, layout, name }: SchemaElementProps) {
  if (!spec || !name) return null;
  return <Schema document={spec} config={config} layout={layout} name={name} />;
}

defineOnce(
  "apiuikit-schema",
  r2wc(SchemaElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
      name: "string",
    },
  }),
);
