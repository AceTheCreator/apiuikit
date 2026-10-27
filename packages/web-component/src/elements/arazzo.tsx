import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Arazzo } from "apiuikit";
import type { ArazzoDiagnostic, ArazzoSourceInput, ConfigInterface } from "apiuikit";
import { defineOnce } from "../registerElement";
import { combineSources, declaredPropTypes, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

export interface ArazzoElementProps extends DeclaredProps {
  /** The parsed Arazzo document. For YAML/JSON text, use <apiuikit-arazzo-renderer>. */
  spec?: Record<string, unknown>;
  /** Source documents keyed by source name. Entries here win over `<script data-source>` children with the same name. */
  sources?: Record<string, ArazzoSourceInput>;
  /** Where the Arazzo document lives; relative source URLs are fetched against it. */
  baseUrl?: string;
  config?: ConfigInterface;
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
}

export function ArazzoElement({ spec, sources, baseUrl, config, onDiagnostics, declaredSources }: ArazzoElementProps) {
  if (!spec) return null;
  return (
    <Arazzo
      arazzo={spec}
      sources={combineSources(declaredSources, sources)}
      baseUrl={baseUrl}
      config={config}
      onDiagnostics={onDiagnostics}
    />
  );
}

defineOnce(
  "apiuikit-arazzo",
  withArazzoDeclarations(
    r2wc(ArazzoElement, {
      props: {
        spec: undefined,
        sources: undefined,
        baseUrl: "string",
        config: "json",
        onDiagnostics: undefined,
        ...declaredPropTypes,
      },
    }),
  ),
);
