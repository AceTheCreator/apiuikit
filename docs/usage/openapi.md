# Usage — OpenAPI

## Overview

apiuikit renders OpenAPI 3.0 and 3.1 documents with the same architecture as its AsyncAPI support: a no-parser entry for documents you already have as a JS object, a with-parser entry for raw YAML/JSON text, composable standalone sections, and web components. Rendering shows Info, Servers, Endpoints (paths grouped by method, with an inline parameters/request body/responses detail panel), and Schemas.

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
| `kind`    | `"resolved"`           | No       | Informational hint that `$ref`s are already inlined    |

As with `AsyncAPI`, `$ref`s are verified rather than trusted: a `kind="resolved"` document that still contains `$ref`s gets resolved anyway.

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

`parseAndRenderOpenAPI(raw, config)` is also available for imperative use, mirroring `parseAndRender`.

## Composable sections

Render one part of an OpenAPI document on its own by passing it a `document`:

```tsx
import { OpenAPIEndpoints } from "apiuikit";
import doc from "./openapi.json";

export default function EndpointsPage() {
  return <OpenAPIEndpoints document={doc} />;
}
```

`OpenAPIServers`, `OpenAPIEndpoints`, `OpenAPISchemas`, and `OpenAPIInfo` all work this way. To arrange several together, wrap them in `OpenAPIProvider` so the document is resolved once and shared:

```tsx
import { OpenAPIProvider, OpenAPIServers, OpenAPIEndpoints, OpenAPISchemas } from "apiuikit";

export default function CustomLayout() {
  return (
    <OpenAPIProvider document={doc}>
      <OpenAPIServers />
      <OpenAPIEndpoints />
      <OpenAPISchemas />
    </OpenAPIProvider>
  );
}
```

## Web components

`@apiuikit/web-component` exposes `<aui-openapi>` and `<aui-openapi-renderer>`, mirroring `<aui-asyncapi>` / `<aui-asyncapi-renderer>`:

```html
<script type="module" src="https://unpkg.com/@apiuikit/web-component"></script>

<aui-openapi id="doc"></aui-openapi>
<script>
  document.getElementById("doc").spec = myResolvedOpenApiDocument;
</script>
```

```html
<aui-openapi-renderer spec="openapi: 3.0.3
info: { title: My API, version: 1.0.0 }
paths: {}"></aui-openapi-renderer>
```

See [Web Components](./with-webcomponents.md) for the full attribute reference — the OpenAPI elements accept the same `spec` / `resolved` / `config` / `onDiagnostics` props as their AsyncAPI counterparts.

## Config

`ConfigInterface.show` gains two OpenAPI-specific flags, `endpoints` and `codeSamples`, alongside the existing `sidebar` / `info` / `servers` / `search` / `schemas` flags (all default to shown):

```tsx
const config: ConfigInterface = {
  show: { endpoints: false }, // hide the Endpoints tab, e.g. for a schema-only reference page
  // show: { codeSamples: false }, // hide the per-operation "Example Request" panel (cURL/JS/Python)
};
```

## When to use which entry

| Scenario                                                | Use                                     |
|-----------------------------------------------------------|------------------------------------------|
| Document is a static JSON file bundled at build time      | `OpenAPI` (no-parser)                    |
| Document is fetched from your own backend (pre-parsed)    | `OpenAPI` (no-parser)                    |
| Document is raw YAML/JSON entered by a user                | `OpenAPIRenderer` or `parseAndRenderOpenAPI` |
| You run the parser yourself before rendering               | `OpenAPI kind="resolved"`                |
