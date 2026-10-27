import { lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { ConfigInterface, defaultConfig } from "../../config";
import { ErrorBoundary, ErrorBoundaryFallbackRenderer } from "../../components/ErrorBoundary";
import type { ApiuikitPlugin } from "../../plugins/types";
import type { ArazzoDiagnostic, ArazzoDocumentData, ArazzoParseResult, ArazzoResolveOptions } from "../../types/arazzo";
import type { ArazzoLayoutProps } from "./Layout";
import { useArazzoModel } from "./useArazzoModel";

// The page itself loads on demand, like the model builder: resolving is
// asynchronous anyway, and apps that never show Arazzo don't carry it.
const Layout = lazy(() => import("./Layout"));

/** Props shared by `Arazzo` and `ArazzoRenderer`: where sources come from, and how the page renders. */
export interface ArazzoCommonProps {
  /**
   * The documents behind `sourceDescriptions`, keyed by each source's `name`:
   * parsed objects, or YAML/JSON text. Sources not listed here are loaded from
   * their `url`. See [Arazzo](https://apiuikit.com/docs/arazzo).
   */
  sources?: ArazzoResolveOptions["sources"];
  /** Where the Arazzo document lives. Relative source `url`s are fetched against it; without it, only absolute ones are. */
  baseUrl?: string;
  /**
   * Loads a source yourself, for example to add auth headers. Receives the
   * `url` (resolved against `baseUrl` when set) and the source description;
   * return the document or its text, or `undefined` if you don't have it.
   * Replaces the built-in fetch.
   */
  loadSource?: ArazzoResolveOptions["loadSource"];
  /** How deep Arazzo sources that list Arazzo sources of their own are followed. Defaults to 3. */
  maxDepth?: number;
  /** Theme, which sections to show, and sidebar options. See [Configuration](https://apiuikit.com/docs/configuration). */
  config?: ConfigInterface;
  /** Plugins for the OpenAPI operations shown in steps, such as a "try it" panel. See [Plugins](https://apiuikit.com/docs/plugins). */
  plugins?: ApiuikitPlugin[];
  /**
   * Called with validation problems, sources that couldn't be loaded, and
   * steps that couldn't be linked, each time the document resolves.
   * The page still renders around them.
   */
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
  /** UI shown if rendering throws. A built-in fallback is used when this is omitted. */
  errorFallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /** Called when rendering throws, for example to report it to your own logging. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Which workflow or step to select on first render, for example from a URL. Applied once. See [Deep linking](https://apiuikit.com/docs/deep-linking). */
  initialLocation?: ArazzoLayoutProps["initialLocation"];
  /** Called when the selected workflow or step changes, for example to keep a URL in sync. */
  onLocationChange?: ArazzoLayoutProps["onLocationChange"];
}

export interface IArazzoProps extends ArazzoCommonProps {
  /** The parsed Arazzo document, for example a JSON file you imported. */
  arazzo: ArazzoDocumentData | Record<string, unknown>;
}

/** Renders a resolved result, once there is one; shared by Arazzo and ArazzoRenderer. */
export function ArazzoResultView({ result, ...props }: { result: ArazzoParseResult | null } & ArazzoCommonProps) {
  const model = result?.model;
  if (!model) return null;
  return (
    <ErrorBoundary resetKey={model} fallback={props.errorFallback} onError={props.onError}>
      <Suspense fallback={null}>
        <Layout
          model={model}
          config={props.config ?? defaultConfig}
          plugins={props.plugins}
          initialLocation={props.initialLocation}
          onLocationChange={props.onLocationChange}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * A full Arazzo documentation page: each workflow's inputs, numbered steps,
 * success criteria, actions and outputs, with the OpenAPI operation every step
 * calls embedded from its source. Pass `arazzo` the parsed document and
 * `sources` the parsed source documents; nothing else needs installing. For
 * YAML or JSON text, use ArazzoRenderer.
 */
export default function Arazzo({ arazzo, ...props }: IArazzoProps) {
  const result = useArazzoModel({ document: arazzo }, props, props.onDiagnostics);
  return <ArazzoResultView result={result} {...props} />;
}
