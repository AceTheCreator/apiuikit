import './index.css';

export { default, default as AsyncAPI } from './containers/AsyncAPI/AsyncAPI';
export type { IAsyncAPIProps } from './containers/AsyncAPI/AsyncAPI';

export { default as OpenAPI } from './containers/OpenAPI/OpenAPI';
export type { IOpenAPIProps } from './containers/OpenAPI/OpenAPI';

export type { ConfigInterface, MarkdownConfig, MarkdownTarget, MarkdownUrlResolver, SidePanelConfig, SidePanelContainment } from './config';

// Publish an AI-discoverable docs site from a document, outside a rendered
// tree: these produce what a `config.markdown.url` points at, from a build
// step or a server route. Spec-agnostic — they dispatch on the document's own
// version key, so the same code path handles AsyncAPI and OpenAPI.
export { documentToLlmsTxt, documentToMarkdown, listDocumentTargets, targetSlug } from './helpers/llmsTxt';
export type { DocumentTarget, LlmsTxtLink, LlmsTxtOptions } from './helpers/llmsTxt';

// Spec-specific serializers, if you already know which spec you have. `deref`
// defaults to resolving JSON Pointers against the document itself, so
// pre-resolved documents need nothing extra.
export {
  asyncApiOperationToMarkdown,
  asyncApiToMarkdown,
  openApiEndpointToMarkdown,
  openApiToMarkdown,
} from './helpers/toMarkdown';
export { defaultConfig } from './config';

export type { AsyncAPIDocumentData } from './types/schema';
export type { OpenAPIDocumentData } from './types/openapi';

export { useAsyncAPIDocument } from './contexts';

export { SchemaTree, SchemaTab } from './components/schema';
export type { SchemaTreeProps } from './components/schema';

export { ErrorBoundary } from './components/ErrorBoundary';
export type { ErrorBoundaryProps, ErrorBoundaryFallbackRenderer } from './components/ErrorBoundary';

export { parseAndRender } from './helpers/parser';
export { AsyncAPIRenderer } from './containers/AsyncAPI/AsyncAPIRenderer';

export { parseAndRender as parseAndRenderOpenAPI } from './helpers/openapiParser';
export { OpenAPIRenderer } from './containers/OpenAPI/OpenAPIRenderer';

// Composable standalone sections: render one part of a document on its own,
// or several together under <AsyncAPIProvider>. See ./public/sections.
export {
  AsyncAPIProvider,
  Servers,
  Operations,
  Messages,
  Schemas,
  Info,
} from './public/sections';
export type { SectionProps } from './public/sections';
export type { SectionLayout } from './components/Section';

// Composable standalone OpenAPI sections — mirrors the AsyncAPI ones above,
// see ./public/openapiSections.
export {
  OpenAPIProvider,
  OpenAPIServers,
  OpenAPIEndpoints,
  OpenAPIWebhooks,
  OpenAPISchemas,
  OpenAPIInfo,
} from './public/openapiSections';
export type { OpenAPISectionProps } from './public/openapiSections';
