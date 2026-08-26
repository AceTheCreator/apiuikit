import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIEndpoints } from "apiuikit";
import type { ConfigInterface, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiEndpointsElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function OpenApiEndpointsElement({ spec, config, layout }: OpenApiEndpointsElementProps) {
  if (!spec) return null;
  return <OpenAPIEndpoints document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-openapi-endpoints",
  r2wc(OpenApiEndpointsElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
