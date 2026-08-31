import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { OpenAPIRenderer } from "apiuikit";
import type { ConfigInterface } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface OpenApiRendererElementProps {
  spec?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: unknown[]) => void;
}

export function OpenApiRendererElement({ spec, config, onDiagnostics }: OpenApiRendererElementProps) {
  if (!spec) return null;
  return <OpenAPIRenderer raw={spec} config={config} onDiagnostics={onDiagnostics} />;
}

defineOnce(
  "apiuikit-openapi-renderer",
  r2wc(OpenApiRendererElement, {
    props: {
      spec: "string",
      config: "json",
      onDiagnostics: undefined,
    },
  }),
);
