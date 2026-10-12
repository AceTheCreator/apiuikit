import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIWebhook } from "apiuikit";
import type { ConfigInterface, HttpMethod, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiWebhookElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
  name?: string;
  method?: HttpMethod;
  onNavigate?: (operationId: string) => void;
}

export function OpenApiWebhookElement({ spec, config, layout, name, method, onNavigate }: OpenApiWebhookElementProps) {
  if (!spec || !name) return null;
  return (
    <OpenAPIWebhook
      document={spec}
      config={config}
      layout={layout}
      name={name}
      method={method}
      onNavigate={onNavigate}
    />
  );
}

defineOnce(
  "apiuikit-openapi-webhook",
  r2wc(OpenApiWebhookElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
      name: "string",
      method: "string",
      onNavigate: undefined,
    },
  }),
);
