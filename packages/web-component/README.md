# @apiuikit/web-component

Framework-agnostic web components for [apiuikit](https://www.npmjs.com/package/apiuikit) — use it from Vue, Angular, Svelte, plain HTML, or any environment that supports custom elements, with no React installation required on the consumer side.

Two custom elements are available:

| Element | When to use |
|---|---|
| `<aui-asyncapi-renderer>` | You have a raw AsyncAPI YAML or JSON string |
| `<aui-asyncapi>` | You already have a parsed AsyncAPI document object |

If you're building a React app, use [apiuikit](https://www.npmjs.com/package/apiuikit) directly instead of this package.

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

<aui-asyncapi-renderer id="doc"></aui-asyncapi-renderer>

<script type="module" src="node_modules/@apiuikit/web-component/dist/web-component.es.js"></script>
<script type="module">
  const res = await fetch("./asyncapi.yaml");
  document.getElementById("doc").spec = await res.text();
</script>
```

## CDN / no bundler

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@apiuikit/web-component/dist/web-component.css" />
<script src="https://cdn.jsdelivr.net/npm/@apiuikit/web-component/dist/web-component.iife.js"></script>

<aui-asyncapi-renderer id="doc"></aui-asyncapi-renderer>
<script>
  document.getElementById("doc").spec = `asyncapi: 3.0.0
info:
  title: Demo
  version: 1.0.0`;
</script>
```

Full prop reference, framework integration notes (Vue, Angular, etc.), and configuration options are documented in [docs/usage/with-webcomponents.md](https://github.com/AceTheCreator/apiuikit/blob/master/docs/usage/with-webcomponents.md) in the main repo.
