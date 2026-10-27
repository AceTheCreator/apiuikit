import { lazy, Suspense, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { DocumentContext } from "../contexts";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";
import type { SectionLayout } from "../components/Section";
import type { ArazzoDiagnostic, ArazzoDocumentData, ArazzoResolveOptions } from "../types/arazzo";
import { ArazzoDocumentProvider } from "../containers/Arazzo/ArazzoDocumentProvider";
import { useArazzoModel } from "../containers/Arazzo/useArazzoModel";

/**
 * Standalone, composable Arazzo section components, the counterpart of
 * public/openapiSections.tsx. Each renders one part of an Arazzo document on
 * its own, dual-mode:
 *   - Standalone: <ArazzoWorkflowSection document={doc} sources={{ petstore }} workflowId="adopt" />
 *   - Composed: <ArazzoProvider document={doc} sources={{ petstore }}><ArazzoInfo /><ArazzoWorkflows /></ArazzoProvider>
 *
 * Unlike OpenAPI, resolving the document is asynchronous (its sources may be
 * fetched), so these don't use createSectionRoot: a section renders nothing
 * until its model is ready. Composing under one ArazzoProvider resolves the
 * document and loads its sources once for every section inside.
 */

/** Where an Arazzo document and its sources come from. Shared by ArazzoProvider and every section on its own. */
export interface ArazzoSourceProps {
  /**
   * The parsed Arazzo document, for example a JSON file you imported, or its
   * YAML/JSON text (reading text needs `@usearazzo/parser` installed).
   * Pass it when this component is on the page by itself.
   * Inside ArazzoProvider, the document comes from there, and a value passed here is ignored.
   */
  document?: ArazzoDocumentData | Record<string, unknown> | string;
  /**
   * The documents behind `sourceDescriptions`, keyed by each source's `name`:
   * parsed objects, or YAML/JSON text. Sources not listed here are loaded from
   * their `url`. See [Arazzo](https://apiuikit.com/docs/arazzo).
   */
  sources?: ArazzoResolveOptions["sources"];
  /** Where the Arazzo document lives. Relative source `url`s are fetched against it; without it, only absolute ones are. */
  baseUrl?: string;
  /** Loads a source yourself, for example to add auth headers. Replaces the built-in fetch. */
  loadSource?: ArazzoResolveOptions["loadSource"];
  /** How deep Arazzo sources that list Arazzo sources of their own are followed. Defaults to 3. */
  maxDepth?: number;
  /** Called with validation problems, unavailable sources and unlinked steps each time the document resolves. */
  onDiagnostics?: (diagnostics: ArazzoDiagnostic[]) => void;
  /**
   * Theme and display options.
   * Used when this component loads the document itself; inside ArazzoProvider, set `config` on the provider.
   * See [Configuration](https://apiuikit.com/docs/configuration).
   */
  config?: ConfigInterface;
  /**
   * Plugins for the OpenAPI operations shown in steps.
   * Used when this component loads the document itself; inside ArazzoProvider, set `plugins` on the provider.
   * See [Plugins](https://apiuikit.com/docs/plugins).
   */
  plugins?: ApiuikitPlugin[];
}

export interface ArazzoSectionProps extends ArazzoSourceProps {
  /**
   * `columns` (the default) leaves an empty column on the right, lining up with the full page.
   * `stacked` uses the full width; choose it when the section is on the page by itself.
   * See [Composables](https://apiuikit.com/docs/sections).
   */
  layout?: SectionLayout;
}

export interface ArazzoWorkflowSectionProps extends ArazzoSectionProps {
  /** The `workflowId` of the workflow to show. */
  workflowId: string;
}

export interface ArazzoProviderProps extends Omit<ArazzoSourceProps, "document"> {
  /** The parsed Arazzo document, or its YAML/JSON text (reading text needs `@usearazzo/parser` installed). */
  document: ArazzoDocumentData | Record<string, unknown> | string;
  children: ReactNode;
}

// Bodies load on demand, like the full page: apps that never show Arazzo don't carry them.
const loadBodies = () => import("../containers/Arazzo/ArazzoSectionBodies");
const InfoBody = lazy(() => loadBodies().then((module) => ({ default: module.ArazzoInfoBody })));
const WorkflowsBody = lazy(() => loadBodies().then((module) => ({ default: module.ArazzoWorkflowsBody })));
const WorkflowBody = lazy(() => loadBodies().then((module) => ({ default: module.ArazzoWorkflowBody })));

/**
 * Resolves an Arazzo document and its sources once, for every Arazzo section
 * inside. Renders nothing until the document has resolved.
 */
export function ArazzoProvider({
  document,
  config,
  plugins,
  children,
  ...options
}: ArazzoProviderProps) {
  const result = useArazzoModel(typeof document === "string" ? { raw: document } : { document }, options, options.onDiagnostics);
  const model = result?.model;
  if (!model) return null;
  return (
    <ArazzoDocumentProvider model={model} config={config} plugins={plugins}>
      {children}
    </ArazzoDocumentProvider>
  );
}

/**
 * Renders `children` with the surrounding ArazzoProvider's model when there
 * is one; otherwise resolves the section's own `document`. Under a provider
 * of another spec type, it warns and falls back to `document` the same way
 * the OpenAPI and AsyncAPI sections do, rendering nothing without one.
 */
function SectionRoot({ children, ...props }: ArazzoSourceProps & { children: ReactNode }) {
  const ambient = useContext(DocumentContext);
  const composed = ambient?.specType === "arazzo";
  const mismatched = !!ambient && !composed;
  const hasDocument = !!props.document;

  useEffect(() => {
    if (!mismatched) return;
    console.warn(
      `[apiuikit] An Arazzo section is rendered inside a ${ambient!.specType} document provider, ` +
        `which cannot supply the document it needs. ` +
        (hasDocument ? "Using the section's own `document` prop instead." : "Wrap it in <ArazzoProvider> or pass it a `document` prop."),
    );
  }, [ambient, mismatched, hasDocument]);

  const body = <Suspense fallback={null}>{children}</Suspense>;
  if (composed) return body;
  if (!props.document) {
    if (mismatched) return null;
    throw new Error("This Arazzo section needs a `document` prop unless it is rendered inside <ArazzoProvider>.");
  }
  return (
    <ArazzoProvider {...props} document={props.document}>
      {body}
    </ArazzoProvider>
  );
}

/**
 * The Arazzo document's title and description, and a chip per source
 * description saying whether it could be loaded.
 *
 * On its own, pass `document` (and `sources`). With other sections, render it
 * inside ArazzoProvider and pass those to the provider instead.
 */
export function ArazzoInfo({ layout, ...props }: ArazzoSectionProps) {
  return (
    <SectionRoot {...props}>
      <InfoBody layout={layout} />
    </SectionRoot>
  );
}

/**
 * Every workflow in an Arazzo document: a list at a glance, then each
 * workflow in full, with its inputs, steps (each embedding the OpenAPI
 * operation it calls), success criteria, actions and outputs.
 *
 * On its own, pass `document` (and `sources`). With other sections, render it
 * inside ArazzoProvider and pass those to the provider instead.
 */
export function ArazzoWorkflows({ layout, ...props }: ArazzoSectionProps) {
  return (
    <SectionRoot {...props}>
      <WorkflowsBody layout={layout} />
    </SectionRoot>
  );
}

/**
 * One workflow, picked by `workflowId`, for example on a page of its own.
 * (Named with "Section" because `ArazzoWorkflow` is the model's type.)
 * Renders nothing, with a console warning, when the document has no such
 * workflow. Links to other workflows only scroll when those are on the page too.
 *
 * On its own, pass `document` (and `sources`). With other sections, render it
 * inside ArazzoProvider and pass those to the provider instead.
 */
export function ArazzoWorkflowSection({ layout, workflowId, ...props }: ArazzoWorkflowSectionProps) {
  return (
    <SectionRoot {...props}>
      <WorkflowBody workflowId={workflowId} layout={layout} />
    </SectionRoot>
  );
}
