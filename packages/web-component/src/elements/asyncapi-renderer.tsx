import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { AsyncAPIRenderer } from "apiuikit";
import type { ConfigInterface } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiRendererElementProps {
  spec?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: unknown[]) => void;
}

export function AsyncApiRendererElement({ spec, config, onDiagnostics }: AsyncApiRendererElementProps) {
  if (!spec) return null;
  return <AsyncAPIRenderer raw={spec} config={config} onDiagnostics={onDiagnostics} />;
}

defineOnce(
  "apiuikit-asyncapi-renderer",
  r2wc(AsyncApiRendererElement, {
    props: {
      spec: "string",
      config: "json",
      onDiagnostics: undefined,
    },
  }),
);
