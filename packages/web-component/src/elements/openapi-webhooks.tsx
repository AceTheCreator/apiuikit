import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIWebhooks } from "apiuikit";
import type { ConfigInterface, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiWebhooksElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function OpenApiWebhooksElement({ spec, config, layout }: OpenApiWebhooksElementProps) {
  if (!spec) return null;
  return <OpenAPIWebhooks document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-openapi-webhooks",
  r2wc(OpenApiWebhooksElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
