import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPI } from "apiuikit";
import type { ConfigInterface, OpenAPIDocumentData } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiElementProps {
  spec?: OpenAPIDocumentData;
  resolved?: boolean;
  config?: ConfigInterface;
}

export function OpenApiElement({ spec, resolved, config }: OpenApiElementProps) {
  if (!spec) return null;
  return resolved ? (
    <OpenAPI kind="resolved" openapi={spec} config={config} />
  ) : (
    <OpenAPI openapi={spec} config={config} />
  );
}

defineOnce(
  "apiuikit-openapi",
  r2wc(OpenApiElement, {
    props: {
      spec: undefined,
      resolved: "boolean",
      config: "json",
    },
  }),
);
