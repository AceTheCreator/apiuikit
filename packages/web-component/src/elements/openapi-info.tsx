import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIInfo } from "apiuikit";
import type { ConfigInterface, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiInfoElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function OpenApiInfoElement({ spec, config, layout }: OpenApiInfoElementProps) {
  if (!spec) return null;
  return <OpenAPIInfo document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-openapi-info",
  r2wc(OpenApiInfoElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
