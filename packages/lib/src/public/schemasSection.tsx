import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { DocumentContext } from "../contexts";
import { AsyncAPIDocumentProvider } from "../containers/AsyncAPI/AsyncAPIDocumentProvider";
import { OpenAPIDocumentProvider } from "../containers/OpenAPI/OpenAPIDocumentProvider";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";
import { AsyncAPIDocumentData, SchemaNodeData } from "../types/schema";
import { OpenAPIDocumentData } from "../types/openapi";
import SchemasContainer from "../containers/Schema/Schemas";
import SchemaCard from "../containers/Schema/SchemaCard";
import Section, { type SectionLayout } from "../components/Section";
import { resolveSchemaInput } from "../helpers/schemaFormat";
import { useProtobufConverterReady } from "../helpers/protobuf/lazyProtoToJsonSchema";
import { useNotFoundWarning } from "./useNotFoundWarning";

/**
 * The one schemas section, for either spec. `components.schemas` is the exact
 * same `Record<string, SchemaNodeData>` on AsyncAPIDocumentData and
 * OpenAPIDocumentData (types/openapi.ts takes SchemaNodeData from
 * types/schema.ts), and the container reads nothing else off the document, so
 * unlike the other sections this one has no spec-specific behaviour to gate on
 * — an ambient provider of either spec type can supply it, and there is
 * nothing for a mismatch warning to warn about.
 */

export interface SchemasSectionProps {
  /**
   * The parsed AsyncAPI or OpenAPI JSON, for example a JSON file you imported.
   * Pass it when this component is on the page by itself.
   * Inside AsyncAPIProvider or OpenAPIProvider, the document comes from there, and a value passed here is ignored.
   */
  document?: AsyncAPIDocumentData | OpenAPIDocumentData;
  /**
   * Theme and display options, such as schema expansion.
   * Used when this component loads the document itself.
   * Inside a provider, set `config` on the provider.
   * See [Configuration](https://apiuikit.com/docs/configuration).
   */
  config?: ConfigInterface;
  /**
   * Plugins for this component.
   * Used when this component loads the document itself.
   * Inside a provider, set `plugins` on the provider.
   * See [Plugins](https://apiuikit.com/docs/plugins).
   */
  plugins?: ApiuikitPlugin[];
  /**
   * `columns` (the default) leaves an empty column on the right so this section
   * lines up with Info and Servers.
   * `stacked` uses the full width; choose it when the section is on the page by itself.
   * See [Composables](https://apiuikit.com/docs/sections).
   */
  layout?: SectionLayout;
}

type AnyDocument = AsyncAPIDocumentData | OpenAPIDocumentData;

const isOpenAPI = (document: AnyDocument): document is OpenAPIDocumentData => {
  const doc = document as Record<string, unknown>;
  return typeof doc.openapi === "string" || typeof doc.swagger === "string";
};

function SchemasBody({ layout }: { layout?: SectionLayout }) {
  const context = useContext(DocumentContext);
  const schemas = (context?.document?.components?.schemas ?? {}) as Record<string, SchemaNodeData>;
  return <SchemasContainer schemas={schemas} layout={layout} />;
}

/**
 * Renders `children` inside the ambient document context if there is one,
 * otherwise resolves `document` and sets up a provider itself. Shared by
 * `Schemas` and `Schema`. Either spec's provider can supply what they read
 * (`components.schemas` and `deref`), so there is no spec-mismatch case.
 */
function SchemaRoot({
  document,
  config,
  plugins,
  sectionName,
  children,
}: Omit<SchemasSectionProps, "layout"> & { sectionName: string; children: ReactNode }) {
  const ambient = useContext(DocumentContext);
  const resolved = useMemo(
    () => (document ? resolveDocument(document) : null),
    [document],
  );

  if (ambient) return <>{children}</>;

  if (!resolved) {
    throw new Error(
      `The ${sectionName} section needs a \`document\` prop unless it is rendered inside ` +
        "<AsyncAPIProvider> or <OpenAPIProvider>.",
    );
  }

  // The container needs a document context for `deref`; which provider
  // establishes it is otherwise immaterial here, so pick by the document's own
  // version key.
  if (isOpenAPI(resolved)) {
    return (
      <OpenAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
        {children}
      </OpenAPIDocumentProvider>
    );
  }

  return (
    <AsyncAPIDocumentProvider document={resolved} config={config} plugins={plugins}>
      {children}
    </AsyncAPIDocumentProvider>
  );
}

/**
 * The schemas in an AsyncAPI or OpenAPI document. Each one is an expandable
 * tree of its properties. The same component works for both specs.
 *
 * On its own, pass `document`. With other sections, render it inside
 * AsyncAPIProvider or OpenAPIProvider and pass `document` to the provider instead.
 */
export function Schemas({ layout, ...rootProps }: SchemasSectionProps) {
  return (
    <SchemaRoot {...rootProps} sectionName="Schemas">
      <SchemasBody layout={layout} />
    </SchemaRoot>
  );
}

export interface SchemaSectionProps extends SchemasSectionProps {
  /** The schema's key under `components.schemas`. */
  name: string;
}

function SchemaBody({ name, layout }: { name: string; layout?: SectionLayout }) {
  const context = useContext(DocumentContext);
  const deref = context?.deref;
  const schema = (context?.document?.components?.schemas as Record<string, SchemaNodeData> | undefined)?.[name];
  // Re-resolves once the (lazy-loaded) Protobuf converter becomes available —
  // see lazyProtoToJsonSchema.ts and the identical memo in Schemas.tsx.
  const protobufReady = useProtobufConverterReady();
  const resolved = useMemo(
    () => (schema && deref ? resolveSchemaInput(schema, deref) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema, deref, protobufReady],
  );
  useNotFoundWarning(!schema, `Schema: no schema "${name}" in components.schemas.`);
  if (!resolved) return null;
  return (
    <div className="flex justify-center w-full">
      <Section
        content={<SchemaCard schemaName={name} resolved={resolved} />}
        stickySideContent={false}
        layout={layout}
      />
    </div>
  );
}

/**
 * One schema from an AsyncAPI or OpenAPI document, as the same card the
 * Schemas section shows for it.
 *
 *   <Schema document={doc} name="Pet" />
 *
 * Renders nothing (and warns) when there is no schema by that name.
 */
export function Schema({ name, layout = "stacked", ...rootProps }: SchemaSectionProps) {
  return (
    <SchemaRoot {...rootProps} sectionName="Schema">
      <SchemaBody name={name} layout={layout} />
    </SchemaRoot>
  );
}

/** @deprecated Use `Schemas` — the schemas section is the same for both specs. */
export const AsyncAPISchemas = Schemas;
/** @deprecated Use `Schemas` — the schemas section is the same for both specs. */
export const OpenAPISchemas = Schemas;
