# Usage — Web Components

## Overview

Use apiuikit from Vue, Angular, Svelte, plain HTML, or any other environment that supports custom elements. Full-document tags:

| Element | When to use |
|---|---|
| `<apiuikit-asyncapi-renderer>` | You have a raw AsyncAPI YAML or JSON string |
| `<apiuikit-asyncapi>` | You already have a parsed AsyncAPI document object |
| `<apiuikit-openapi-renderer>` | You have a raw OpenAPI YAML or JSON string |
| `<apiuikit-openapi>` | You already have a parsed OpenAPI document object |

There are also standalone elements for individual document sections (servers, operations, messages, schemas, info) — see [Section elements](#section-elements) below.

If you're building a React app, prefer the [React entry without parser](./no-parser.md) or [React entry with parser](./with-parser.md) according to your usecase instead.

Elements render into light DOM (no shadow root) — apiuikit's CSS applies globally, and your page's own CSS can just as easily reach inside the widget. Keep selectors in your page's stylesheet scoped (classes, not bare tag selectors like `p` or `h2`) so they don't accidentally style content apiuikit renders inside the element.

## Install

```bash
npm install @apiuikit/web-component
```

Then load the elements and stylesheet once in your app:

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";
```

No extra packages are required — React, ReactDOM, and parsing support are bundled in.

## Modular imports

The default entry point above registers every element. If you only use a few, import just those instead — each subpath registers only its own element:

```js
import "@apiuikit/web-component/asyncapi-renderer";  // <apiuikit-asyncapi-renderer> only
import "@apiuikit/web-component/asyncapi";            // <apiuikit-asyncapi> only
import "@apiuikit/web-component/asyncapi-servers";    // <apiuikit-asyncapi-servers> only
import "@apiuikit/web-component/asyncapi-operations"; // <apiuikit-asyncapi-operations> only
import "@apiuikit/web-component/asyncapi-messages";   // <apiuikit-asyncapi-messages> only
import "@apiuikit/web-component/asyncapi-info";       // <apiuikit-asyncapi-info> only
import "@apiuikit/web-component/openapi-renderer";    // <apiuikit-openapi-renderer> only
import "@apiuikit/web-component/openapi";             // <apiuikit-openapi> only
import "@apiuikit/web-component/openapi-servers";     // <apiuikit-openapi-servers> only
import "@apiuikit/web-component/openapi-endpoints";   // <apiuikit-openapi-endpoints> only
import "@apiuikit/web-component/openapi-webhooks";    // <apiuikit-openapi-webhooks> only
import "@apiuikit/web-component/openapi-info";        // <apiuikit-openapi-info> only
import "@apiuikit/web-component/schemas";             // <apiuikit-schemas> only — shared by both spec types
import "@apiuikit/web-component/style.css";
```

Mix and match as needed — e.g. `import "@apiuikit/web-component/asyncapi-operations"` alone if operations are the only thing your app renders. The stylesheet (`./style.css`) is the same regardless of which subpath(s) you import, so it's only ever loaded once.

## Quick start

```html
<link rel="stylesheet" href="node_modules/@apiuikit/web-component/dist/web-component.css" />

<apiuikit-asyncapi-renderer id="doc"></apiuikit-asyncapi-renderer>

<script type="module" src="node_modules/@apiuikit/web-component/dist/web-component.es.js"></script>
<script type="module">
  const res = await fetch("./asyncapi.yaml");
  document.getElementById("doc").spec = await res.text();
</script>
```

That's enough to render a document. The sections below cover props, configuration, and framework usage.

## `<apiuikit-asyncapi-renderer>`

Pass a raw AsyncAPI document as a string. The element parses it and renders the UI. Available standalone via `@apiuikit/web-component/asyncapi-renderer`.

| Name | How to set it | Type | Description |
|---|---|---|---|
| `spec` | attribute or property | `string` | Raw AsyncAPI document (YAML or JSON) |
| `config` | property, or JSON string attribute | object | UI options (theme, sidebar, what to show, etc.) |
| `onDiagnostics` | property only | `(diagnostics) => void` | Called after parsing with any validation messages |

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-asyncapi-renderer");
el.spec = rawYaml;
el.config = { theme: { dark: { background: "#1a1b26", surface: "#24283b", textPrimary: "#c0caf5" } } };
el.onDiagnostics = (diagnostics) => console.log(diagnostics);
```

## `<apiuikit-asyncapi>`

Pass an already-parsed AsyncAPI document object. Use this when your backend or build step has already resolved the document. Available standalone via `@apiuikit/web-component/asyncapi`.

| Name | How to set it | Type | Description |
|---|---|---|---|
| `spec` | property only | object | Parsed AsyncAPI document |
| `resolved` | boolean attribute | `boolean` | Set if `$ref`s were already fully resolved upstream |
| `config` | property, or JSON string attribute | object | UI options |

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-asyncapi");
el.spec = parsedDocument;
el.config = { show: { sidebar: true } };
```

Because `spec` is an object, set it from JavaScript (`el.spec = ...`), not as an HTML attribute.

## `<apiuikit-openapi-renderer>` and `<apiuikit-openapi>`

Mirror `<apiuikit-asyncapi-renderer>` and `<apiuikit-asyncapi>` exactly (same prop names and types — `spec`, `config`, `onDiagnostics` on the renderer; `spec`, `resolved`, `config` on the no-parser element), just for OpenAPI documents. Available standalone via `@apiuikit/web-component/openapi-renderer` and `@apiuikit/web-component/openapi`.

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-openapi-renderer");
el.spec = rawOpenApiYaml;
el.onDiagnostics = (diagnostics) => console.log(diagnostics);
```

## Section elements

Instead of the whole `<apiuikit-asyncapi>` / `<apiuikit-openapi>` widget, render just one part of a document — useful for building your own layout around individual pieces (e.g. an operations table on its own page, a servers list in a sidebar).

| Element | Renders |
|---|---|
| `<apiuikit-asyncapi-servers>` | AsyncAPI servers |
| `<apiuikit-asyncapi-operations>` | AsyncAPI operations |
| `<apiuikit-asyncapi-messages>` | AsyncAPI messages |
| `<apiuikit-asyncapi-info>` | AsyncAPI info block (title, description, license) |
| `<apiuikit-openapi-servers>` | OpenAPI servers |
| `<apiuikit-openapi-endpoints>` | OpenAPI paths/endpoints |
| `<apiuikit-openapi-webhooks>` | OpenAPI 3.1 webhooks (renders nothing if the document declares none) |
| `<apiuikit-openapi-info>` | OpenAPI info block (title, description, tags, external docs) |
| `<apiuikit-schemas>` | Component schemas — one element for **either** spec type (see below) |

All nine take the same three props:

| Name | How to set it | Type | Description |
|---|---|---|---|
| `spec` | property only | object | The **parsed** document (same shape as `<apiuikit-asyncapi>`/`<apiuikit-openapi>`'s `spec`) — not a raw YAML/JSON string |
| `config` | property, or JSON string attribute | object | UI options |
| `layout` | attribute or property | `"columns"` \| `"stacked"` | `"columns"` (default) reserves a right gutter at large breakpoints; `"stacked"` is full-width single column |

```js
import "@apiuikit/web-component/asyncapi-operations";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-asyncapi-operations");
el.spec = parsedAsyncApiDocument;
el.layout = "stacked";
```

`<apiuikit-schemas>` is unsplit on purpose: `components.schemas` is the exact same shape on AsyncAPI and OpenAPI documents, so a parsed document of either type works:

```js
import "@apiuikit/web-component/schemas";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-schemas");
el.spec = parsedAsyncApiDocument; // or a parsed OpenAPI document — both work
```

Each element is standalone — it resolves its own copy of `spec` independently, so there's no shared-context "provider" mode across separate custom elements the way there is in the [React API](./with-parser.md). If you need several sections sharing one resolved document without each re-resolving it, or you're building a React app, use apiuikit's React `AsyncAPIProvider`/`OpenAPIProvider` and section components directly instead of the web components.

## Setting props from HTML vs JavaScript

- Strings can be attributes (`spec="..."` on the renderer) or properties.
- Objects (`config`, and `spec` on `<apiuikit-asyncapi>`) and functions (`onDiagnostics`) must be set as JavaScript properties.
- `config` can also be a JSON string attribute for simple static cases:

```html
<apiuikit-asyncapi-renderer
  spec='{"asyncapi":"3.0.0","info":{"title":"Demo","version":"1.0.0"}}'
  config='{"theme":{"dark":{"background":"#1a1b26","surface":"#24283b","textPrimary":"#c0caf5"}}}'
></apiuikit-asyncapi-renderer>
```

## CDN / no bundler

Use the IIFE build with a normal script tag (no `type="module"` required):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@apiuikit/web-component/dist/web-component.css" />
<script src="https://cdn.jsdelivr.net/npm/@apiuikit/web-component/dist/web-component.iife.js"></script>

<apiuikit-asyncapi-renderer id="doc"></apiuikit-asyncapi-renderer>
<script>
  document.getElementById("doc").spec = `asyncapi: 3.0.0
info:
  title: Demo
  version: 1.0.0`;
</script>
```

Adjust the CDN URLs to the version you want to pin.

## In a framework (Vue example)

Tell your framework to treat `apiuikit-*` tags as native custom elements. In Vue with Vite:

```js
// vite.config.js
export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("apiuikit-"),
        },
      },
    }),
  ],
};
```

```vue
<template>
  <apiuikit-asyncapi-renderer ref="el" />
</template>

<script setup>
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";
import { onMounted, ref } from "vue";

const el = ref(null);

onMounted(async () => {
  el.value.spec = await fetch("./asyncapi.yaml").then((r) => r.text());
});
</script>
```

Other frameworks have a similar “custom elements” option (Angular `CUSTOM_ELEMENTS_SCHEMA`, etc.).
