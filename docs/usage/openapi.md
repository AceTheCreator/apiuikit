# Usage — OpenAPI

## Overview

apiuikit accepts OpenAPI 3.0 and 3.1 documents through a no-parser entry for documents you already have as a JS object, a with-parser entry for raw YAML/JSON text, composable standalone sections, and web components. Version compatibility is separate from UI coverage: the renderer does not claim a dedicated view for every keyword in the OpenAPI specification. The exact features currently rendered are listed below.

### Coverage

Rendered today:

- `info` (including `x-logo` and the known `x-*` extension catalog), `tags`, `externalDocs`
- `servers`, with `{variable}` segments showing their description, default, and allowed values on hover
- `paths`: operations by method, with summary/description, deprecation badges, parameters (path and query on the address bar, header and cookie in the request card), `requestBody` with a media-type switcher, and per-status `responses` covering body, response `headers`, and `links`
- `webhooks` (3.1), in their own tab, using the same detail panel as endpoints
- `callbacks`, as a collapsible section on the operation that declares them, each rendered through the same operation view
- Security: document-level and operation-level `security` resolved against `components.securitySchemes`, rendered as an Authorization card (API key, HTTP, OAuth2 flows and scopes, OpenID Connect)
- `components.schemas`, plus `$ref` resolution throughout

Every keyword the renderer models is now rendered. Callbacks nested inside a
callback are the one deliberate stop: they render one level deep, since deeper
nesting is vanishingly rare and a cyclic `$ref` would otherwise not terminate.

## `OpenAPI` component (without parser)

Use this when you already have a resolved OpenAPI document — fetched from your own API, bundled at build time, or processed server-side. `@scalar/openapi-parser` is not required and will never be included in your bundle.

```tsx
import { OpenAPI } from "apiuikit";
import "apiuikit/style.css";
import doc from "./openapi.json";

export default function App() {
  return <OpenAPI openapi={doc} />;
}
```

### Props

| Prop      | Type                   | Required | Description                                          |
|-----------|------------------------|----------|-------------------------------------------------------|
| `openapi` | `OpenAPIDocumentData`  | Yes      | A pre-resolved OpenAPI 3.0/3.1 document object         |
| `config`  | `ConfigInterface`      | No       | UI configuration (theme, show flags, sidebar, etc.)    |
| `plugins` | `ApiuikitPlugin[]`     | No       | Third-party plugins to render into the document's extension slots. See [Plugins](./plugins.md). |
| `kind`    | `"resolved"`           | No       | Promise that `$ref`s are already inlined (verified)    |
| `errorFallback` | `ReactNode \| (error, reset) => ReactNode` | No | Custom UI shown if rendering throws. Defaults to a built-in fallback |
| `onError` | `(error, errorInfo) => void` | No     | Called once when a render error is caught, e.g. to report it to your own telemetry |

As with `AsyncAPI`, `$ref`s are verified rather than trusted: a `kind="resolved"` document that still contains `$ref`s gets resolved anyway, with a console warning that the promise was false.

### Error handling

The component wraps its own tree in an error boundary, so a render-time throw from a malformed or edge-case document is contained here instead of unmounting your application. The default fallback is an alert with the error message and a "Try again" button; pass `errorFallback` to replace it, and `onError` to report the failure:

```tsx
<OpenAPI
  openapi={doc}
  errorFallback={(error, reset) => <MyFallback message={error.message} onRetry={reset} />}
  onError={(error, errorInfo) => reportToSentry(error, errorInfo)}
/>
```

This only covers synchronous render errors, which is all a React error boundary can see. Parse failures surface through `OpenAPIRenderer`'s `onDiagnostics` instead.

## `OpenAPIRenderer` component (with parser)

Use this when you have raw YAML/JSON text — user-entered, or loaded from a file at runtime. It parses, validates, and dereferences the document via `@scalar/openapi-parser` (install it as a dependency of your app):

```bash
npm install @scalar/openapi-parser
```

```tsx
import { OpenAPIRenderer } from "apiuikit";
import "apiuikit/style.css";

export default function App() {
  return (
    <OpenAPIRenderer
      raw={rawYamlOrJsonString}
      onDiagnostics={(diagnostics) => console.log(diagnostics)}
    />
  );
}
```

Diagnostics use the same shape as AsyncAPI's (`{ message, path, severity }`, `severity: 0` for errors), so a shared diagnostics panel works for both.

`errorFallback`, `onError`, and `plugins` are accepted here too and forwarded to the underlying `OpenAPI` component, so the raw-string entry point gets the same error boundary and the same customization.

`parseAndRenderOpenAPI(raw, config)` is also available for imperative use, mirroring `parseAndRender`.

## Composable sections

Render one part of an OpenAPI document on its own by passing it a `document`:

```tsx
import { OpenAPIEndpoints } from "apiuikit";
import doc from "./openapi.json";

export default function EndpointsPage() {
  // Prefer layout="stacked" when embedding a section alone — same prop as
  // AsyncAPI sections (see [sections](./sections.md#props)).
  return <OpenAPIEndpoints document={doc} layout="stacked" />;
}
```

`OpenAPIServers`, `OpenAPIEndpoints`, `Schemas`, and `OpenAPIInfo` all work this way. Standalone, they also accept `plugins` (same rule as `config`: applied only when the section sets up its own context). To arrange several together, wrap them in `OpenAPIProvider` so the document is resolved once and shared — put `plugins` on the provider, not on each section:

```tsx
import { OpenAPIProvider, OpenAPIServers, OpenAPIEndpoints, Schemas } from "apiuikit";

export default function CustomLayout() {
  return (
    <OpenAPIProvider document={doc}>
      <OpenAPIServers />
      <OpenAPIEndpoints />
      <Schemas />
    </OpenAPIProvider>
  );
}
```

Sections and providers render without an error boundary of their own, unlike `OpenAPI` above. See [Error handling](./sections.md#error-handling) for why, and for how to wrap them in the exported `ErrorBoundary` yourself.

## Web components

`@apiuikit/web-component` exposes `<apiuikit-openapi>` and `<apiuikit-openapi-renderer>`, mirroring `<apiuikit-asyncapi>` / `<apiuikit-asyncapi-renderer>`:

```html
<script type="module" src="https://unpkg.com/@apiuikit/web-component"></script>

<apiuikit-openapi id="doc"></apiuikit-openapi>
<script>
  document.getElementById("doc").spec = myResolvedOpenApiDocument;
</script>
```

```html
<apiuikit-openapi-renderer spec="openapi: 3.0.3
info: { title: My API, version: 1.0.0 }
paths: {}"></apiuikit-openapi-renderer>
```

See [Web Components](./with-webcomponents.md) for the full attribute reference — the OpenAPI elements accept the same `spec` / `resolved` / `config` / `onDiagnostics` props as their AsyncAPI counterparts.

## Config

`ConfigInterface.show` gains three OpenAPI-specific flags, `endpoints`, `webhooks`, and `codeSamples`, alongside the existing `sidebar` / `info` / `servers` / `search` / `schemas` flags (all default to shown):

```tsx
const config: ConfigInterface = {
  show: { endpoints: false }, // hide the Endpoints tab, e.g. for a schema-only reference page
  // show: { codeSamples: false }, // hide the per-operation "Example Request" panel (agent prompt, cURL, JS, Python, ...)
};
```

The Webhooks tab additionally only appears when the document actually declares
`webhooks`, so `show.webhooks` is only needed to hide one that would otherwise
show.

## When to use which entry

| Scenario                                                | Use                                     |
|-----------------------------------------------------------|------------------------------------------|
| Document is a static JSON file bundled at build time      | `OpenAPI` (no-parser)                    |
| Document is fetched from your own backend (pre-parsed)    | `OpenAPI` (no-parser)                    |
| Document is raw YAML/JSON entered by a user                | `OpenAPIRenderer` or `parseAndRenderOpenAPI` |
| You run the parser yourself before rendering               | `OpenAPI kind="resolved"`                |
