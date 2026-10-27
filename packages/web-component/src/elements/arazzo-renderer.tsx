import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { ArazzoRenderer } from "apiuikit";
import type { ArazzoDiagnostic, ArazzoSourceInput, ConfigInterface } from "apiuikit";
import { defineOnce } from "../registerElement";
import { combineSources, declaredPropTypes, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

export interface ArazzoRendererElementProps extends DeclaredProps {
  /** The Arazzo document as YAML/JSON text. Wins over a `<script data-arazzo>` child. */
  spec?: string;
  /** Source documents keyed by source name. Entries here win over `<script data-source>` children with the same name. */
  sources?: Record<string, ArazzoSourceInput>;
  /** Where the Arazzo document lives; relative source URLs are fetched against it. */
  baseUrl?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
}

export function ArazzoRendererElement({
  spec,
  sources,
  baseUrl,
  config,
  onDiagnostics,
  declaredSpec,
  declaredSources,
}: ArazzoRendererElementProps) {
  const raw = spec ?? declaredSpec;
  if (!raw) return null;
  return (
    <ArazzoRenderer
      raw={raw}
      sources={combineSources(declaredSources, sources)}
      baseUrl={baseUrl}
      config={config}
      onDiagnostics={onDiagnostics}
    />
  );
}

defineOnce(
  "apiuikit-arazzo-renderer",
  withArazzoDeclarations(
    r2wc(ArazzoRendererElement, {
      props: {
        spec: "string",
        sources: undefined,
        baseUrl: "string",
        config: "json",
        onDiagnostics: undefined,
        ...declaredPropTypes,
      },
    }),
  ),
);
