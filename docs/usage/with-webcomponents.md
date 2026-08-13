# Usage — Web Components

## Overview

Use apiuikit from Vue, Angular, Svelte, plain HTML, or any other environment that supports custom elements. Four tags are available:

| Element | When to use |
|---|---|
| `<apiuikit-asyncapi-renderer>` | You have a raw AsyncAPI YAML or JSON string |
| `<apiuikit-asyncapi>` | You already have a parsed AsyncAPI document object |
| `<apiuikit-openapi-renderer>` | You have a raw OpenAPI YAML or JSON string |
| `<apiuikit-openapi>` | You already have a parsed OpenAPI document object |

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

Pass a raw AsyncAPI document as a string. The element parses it and renders the UI.

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

Pass an already-parsed AsyncAPI document object. Use this when your backend or build step has already resolved the document.

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

Mirror `<apiuikit-asyncapi-renderer>` and `<apiuikit-asyncapi>` exactly (same prop names and types — `spec`, `config`, `onDiagnostics` on the renderer; `spec`, `resolved`, `config` on the no-parser element), just for OpenAPI documents:

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const el = document.querySelector("apiuikit-openapi-renderer");
el.spec = rawOpenApiYaml;
el.onDiagnostics = (diagnostics) => console.log(diagnostics);
```

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
