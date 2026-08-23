import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIServers } from "apiuikit";
import type { ConfigInterface, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiServersElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function OpenApiServersElement({ spec, config, layout }: OpenApiServersElementProps) {
  if (!spec) return null;
  return <OpenAPIServers document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-openapi-servers",
  r2wc(OpenApiServersElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
