import './index.css';

export { default, default as AsyncAPI } from './containers/AsyncAPI/AsyncAPI';
export type { IAsyncAPIProps } from './containers/AsyncAPI/AsyncAPI';

export { default as OpenAPI } from './containers/OpenAPI/OpenAPI';
export type { IOpenAPIProps } from './containers/OpenAPI/OpenAPI';

export type { ConfigInterface } from './config';
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
