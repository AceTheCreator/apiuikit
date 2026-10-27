import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { ArazzoInfo } from "apiuikit";
import type { ArazzoDiagnostic, ArazzoSourceInput, ConfigInterface, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";
import { combineSources, declaredPropTypes, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

export interface ArazzoInfoElementProps extends DeclaredProps {
  /** The Arazzo document: parsed, or YAML/JSON text. Wins over a `<script data-arazzo>` child. */
  spec?: Record<string, unknown> | string;
  /** Source documents keyed by source name. Entries here win over `<script data-source>` children with the same name. */
  sources?: Record<string, ArazzoSourceInput>;
  /** Where the Arazzo document lives; relative source URLs are fetched against it. */
  baseUrl?: string;
  config?: ConfigInterface;
  layout?: SectionLayout;
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
}

// The title, description and a chip per source: the ArazzoInfo component.
export function ArazzoInfoElement({
  spec,
  sources,
  baseUrl,
  config,
  layout,
  onDiagnostics,
  declaredSpec,
  declaredSources,
}: ArazzoInfoElementProps) {
  const document = spec ?? declaredSpec;
  if (!document) return null;
  return (
    <ArazzoInfo
      document={document}
      sources={combineSources(declaredSources, sources)}
      baseUrl={baseUrl}
      config={config}
      layout={layout}
      onDiagnostics={onDiagnostics}
    />
  );
}

defineOnce(
  "apiuikit-arazzo-info",
  withArazzoDeclarations(
    r2wc(ArazzoInfoElement, {
      props: {
        spec: undefined,
        sources: undefined,
        baseUrl: "string",
        config: "json",
        layout: "string",
        onDiagnostics: undefined,
        ...declaredPropTypes,
      },
    }),
  ),
);
