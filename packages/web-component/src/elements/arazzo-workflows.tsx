import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { ArazzoWorkflows } from "apiuikit";
import type { ArazzoDiagnostic, ArazzoSourceInput, ConfigInterface, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";
import { combineSources, declaredPropTypes, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

export interface ArazzoWorkflowsElementProps extends DeclaredProps {
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

// Every workflow in the document: the ArazzoWorkflows component.
export function ArazzoWorkflowsElement({
  spec,
  sources,
  baseUrl,
  config,
  layout,
  onDiagnostics,
  declaredSpec,
  declaredSources,
}: ArazzoWorkflowsElementProps) {
  const document = spec ?? declaredSpec;
  if (!document) return null;
  return (
    <ArazzoWorkflows
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
  "apiuikit-arazzo-workflows",
  withArazzoDeclarations(
    r2wc(ArazzoWorkflowsElement, {
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
