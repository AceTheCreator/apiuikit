import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { ArazzoWorkflowSection } from "apiuikit";
import type { ArazzoDiagnostic, ArazzoSourceInput, ConfigInterface, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";
import { combineSources, declaredPropTypes, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

export interface ArazzoWorkflowElementProps extends DeclaredProps {
  /** The Arazzo document: parsed, or YAML/JSON text. Wins over a `<script data-arazzo>` child. */
  spec?: Record<string, unknown> | string;
  /** The `workflowId` of the workflow to show. */
  workflowId?: string;
  /** Source documents keyed by source name. Entries here win over `<script data-source>` children with the same name. */
  sources?: Record<string, ArazzoSourceInput>;
  /** Where the Arazzo document lives; relative source URLs are fetched against it. */
  baseUrl?: string;
  config?: ConfigInterface;
  layout?: SectionLayout;
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
}

// One workflow, by `workflow-id`: the ArazzoWorkflowSection component.
export function ArazzoWorkflowElement({
  spec,
  workflowId,
  sources,
  baseUrl,
  config,
  layout,
  onDiagnostics,
  declaredSpec,
  declaredSources,
}: ArazzoWorkflowElementProps) {
  const document = spec ?? declaredSpec;
  if (!document || !workflowId) return null;
  return (
    <ArazzoWorkflowSection
      document={document}
      workflowId={workflowId}
      sources={combineSources(declaredSources, sources)}
      baseUrl={baseUrl}
      config={config}
      layout={layout}
      onDiagnostics={onDiagnostics}
    />
  );
}

defineOnce(
  "apiuikit-arazzo-workflow",
  withArazzoDeclarations(
    r2wc(ArazzoWorkflowElement, {
      props: {
        spec: undefined,
        workflowId: "string",
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
