import AsyncAPI, { AsyncAPIRenderer, OpenAPI, OpenAPIRenderer } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, OpenAPIDocumentData } from "apiuikit";

export interface AsyncApiElementProps {
  spec?: AsyncAPIDocumentData;
  resolved?: boolean;
  config?: ConfigInterface;
}

export function AsyncApiElement({ spec, resolved, config }: AsyncApiElementProps) {
  if (!spec) return null;
  return resolved ? (
    <AsyncAPI kind="resolved" asyncapi={spec} config={config} />
  ) : (
    <AsyncAPI asyncapi={spec} config={config} />
  );
}

export interface AsyncApiRendererElementProps {
  spec?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: unknown[]) => void;
}

export function AsyncApiRendererElement({ spec, config, onDiagnostics }: AsyncApiRendererElementProps) {
  if (!spec) return null;
  return <AsyncAPIRenderer raw={spec} config={config} onDiagnostics={onDiagnostics} />;
}

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

export interface OpenApiRendererElementProps {
  spec?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: unknown[]) => void;
}

export function OpenApiRendererElement({ spec, config, onDiagnostics }: OpenApiRendererElementProps) {
  if (!spec) return null;
  return <OpenAPIRenderer raw={spec} config={config} onDiagnostics={onDiagnostics} />;
}
