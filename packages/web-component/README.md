# @apiuikit/web-component

Framework-agnostic web components for [apiuikit](https://www.npmjs.com/package/apiuikit) — use it from Vue, Angular, Svelte, plain HTML, or any environment that supports custom elements, with no React installation required on the consumer side.

Full-document elements:

| Element | When to use |
|---|---|
| `<apiuikit-asyncapi-renderer>` | You have a raw AsyncAPI YAML or JSON string |
| `<apiuikit-asyncapi>` | You already have a parsed AsyncAPI document object |
| `<apiuikit-openapi-renderer>` | You have a raw OpenAPI YAML or JSON string |
| `<apiuikit-openapi>` | You already have a parsed OpenAPI document object |

Plus standalone elements for individual sections — `<apiuikit-asyncapi-servers>`, `-operations`, `-messages`, `-info`, their OpenAPI equivalents (`<apiuikit-openapi-servers>`, `-endpoints`, `-webhooks`, `-info`), and a single `<apiuikit-schemas>` shared by both spec types (`components.schemas` is the same shape either way) — for when you want just one part of a document rendered on its own. See [docs/usage/with-webcomponents.md](https://github.com/AceTheCreator/apiuikit/blob/master/docs/usage/with-webcomponents.md#section-elements) for the full prop reference.

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

### Modular imports

Only need one or two elements? Import just those instead of the full bundle:

```js
import "@apiuikit/web-component/asyncapi-renderer";   // <apiuikit-asyncapi-renderer> only
import "@apiuikit/web-component/asyncapi";             // <apiuikit-asyncapi> only
import "@apiuikit/web-component/asyncapi-operations";  // <apiuikit-asyncapi-operations> only
import "@apiuikit/web-component/openapi-renderer";     // <apiuikit-openapi-renderer> only
import "@apiuikit/web-component/openapi";              // <apiuikit-openapi> only
import "@apiuikit/web-component/openapi-endpoints";    // <apiuikit-openapi-endpoints> only
import "@apiuikit/web-component/style.css";
```

(Every full-document and section element has a matching subpath — see the docs link above for the complete list.)

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

## CDN / no bundler

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

Full prop reference, framework integration notes (Vue, Angular, etc.), and configuration options are documented in [docs/usage/with-webcomponents.md](https://github.com/AceTheCreator/apiuikit/blob/master/docs/usage/with-webcomponents.md) in the main repo.
