import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIEndpoint } from "apiuikit";
import type { ConfigInterface, HttpMethod, OpenAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiEndpointElementProps {
  spec?: OpenAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
  operationId?: string;
  method?: HttpMethod;
  path?: string;
  onNavigate?: (operationId: string) => void;
}

// Names the endpoint by `operation-id`, or by `method` + `path` when no
// operation id is set — the same two selectors OpenAPIEndpoint accepts.
export function OpenApiEndpointElement({
  spec,
  config,
  layout,
  operationId,
  method,
  path,
  onNavigate,
}: OpenApiEndpointElementProps) {
  if (!spec) return null;
  if (operationId) {
    return (
      <OpenAPIEndpoint
        document={spec}
        config={config}
        layout={layout}
        operationId={operationId}
        onNavigate={onNavigate}
      />
    );
  }
  if (!method || !path) return null;
  return (
    <OpenAPIEndpoint
      document={spec}
      config={config}
      layout={layout}
      method={method}
      path={path}
      onNavigate={onNavigate}
    />
  );
}

defineOnce(
  "apiuikit-openapi-endpoint",
  r2wc(OpenApiEndpointElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
      operationId: "string",
      method: "string",
      path: "string",
      onNavigate: undefined,
    },
  }),
);
