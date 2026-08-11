# apiuikit

[![npm version](https://img.shields.io/npm/v/apiuikit.svg)](https://www.npmjs.com/package/apiuikit)
[![npm downloads](https://img.shields.io/npm/dm/apiuikit.svg)](https://www.npmjs.com/package/apiuikit)
[![npm version](https://img.shields.io/npm/v/@apiuikit/web-component.svg?label=%40apiuikit%2Fweb-component)](https://www.npmjs.com/package/@apiuikit/web-component)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

React component library for rendering API specifications. Point it at an AsyncAPI or OpenAPI document and get a full interactive UI, which includes: servers, channels/endpoints, operations, messages, schemas, with no manual mapping required.

> **Status:** AsyncAPI 3.x and OpenAPI 3.0/3.1 are both fully supported, see
> [Coverage](./docs/usage/openapi.md#coverage) for the OpenAPI breakdown.

## Install

```bash
npm install apiuikit
```

If you want to hand it a raw YAML/JSON string instead of a pre-parsed object, also install the peer dependency for whichever spec you're rendering:

```bash
npm install @asyncapi/parser      # for AsyncAPI documents
npm install @scalar/openapi-parser # for OpenAPI documents
```

[![Edit Apiuikit React Component](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/6jw4pf)

## Usage in React

The quickest path to use the kit for AsyncAPI is to pass a pre-resolved AsyncAPI document object (e.g. imported from a JSON file, or fetched from your own backend):

```tsx
import { AsyncAPI } from "apiuikit";
import "apiuikit/style.css";
import doc from "./asyncapi.json";

export default function App() {
  return <AsyncAPI asyncapi={doc} />;
}
```

If you have a raw YAML/JSON string instead (e.g. entered by a user, or loaded from a file at runtime), use `AsyncAPIRenderer`, which parses and validates it for you:

```tsx
import { AsyncAPIRenderer } from "apiuikit";
import "apiuikit/style.css";

export default function App() {
  return <AsyncAPIRenderer raw={rawYamlOrJsonString} />;
}
```

Avro and Protobuf message payloads are supported out of the box in both entry points, no extra install required.

The same two entry points exist for OpenAPI, as `OpenAPI` / `OpenAPIRenderer`:

```tsx
import { OpenAPI } from "apiuikit";
import "apiuikit/style.css";
import doc from "./openapi.json";

export default function App() {
  return <OpenAPI openapi={doc} />;
}
```

### Rendering sections individually

Prefer your own layout over the full widget? Render one section on its own by passing it a `document`:

```tsx
import { Operations } from "apiuikit";
import doc from "./asyncapi.json";

export default function OperationsPage() {
  return <Operations document={doc} />;
}
```

`Servers`, `Operations`, `Messages`, `Schemas`, and `Info` all work this way (OpenAPI equivalents: `OpenAPIServers`, `OpenAPIEndpoints`, `OpenAPISchemas`, `OpenAPIInfo`). To arrange several of them together, wrap them in `AsyncAPIProvider` (or `OpenAPIProvider`) instead so the document is resolved once and shared:

```tsx
import { AsyncAPIProvider, Servers, Operations, Schemas } from "apiuikit";

export default function CustomLayout() {
  return (
    <AsyncAPIProvider document={doc}>
      <Servers />
      <Operations />
      <Schemas />
    </AsyncAPIProvider>
  );
}
```

See the full usage docs for props, configuration options, and more:

- [Without Parser](./docs/usage/no-parser.md) (`AsyncAPI` component)
- [With Parser](./docs/usage/with-parser.md) (`AsyncAPIRenderer` component, `parseAndRender` utility)
- [Composable Sections](./docs/usage/sections.md) (`Servers`, `Operations`, `Messages`, `Schemas`, `Info`, `AsyncAPIProvider`)
- [Web Components](./docs/usage/with-webcomponents.md) (`<aui-asyncapi>`, `<aui-asyncapi-renderer>`, use apiuikit from any framework)
- [Markdown export](./docs/usage/markdown-export.md) (making your docs AI-readable: `config.markdown.url`, `documentToMarkdown`, `documentToLlmsTxt`)
- [Avro schemas](./docs/usage/avro.md)
- [Protobuf schemas](./docs/usage/protobuf.md)
- [OpenAPI](./docs/usage/openapi.md) (`OpenAPI`, `OpenAPIRenderer`, composable sections, web components)

## Usage with Web Components

For Vue, Angular, Svelte, plain HTML, or any other environment that supports custom elements, use the framework-agnostic web-component package. React and the document parsers are bundled, so consumers do not need to install them separately.

```bash
npm install @apiuikit/web-component
```

Load the custom elements and stylesheet once, then pass a raw AsyncAPI or OpenAPI document to the corresponding renderer:

```html
<aui-asyncapi-renderer id="api-doc"></aui-asyncapi-renderer>
```

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const apiDoc = document.querySelector("#api-doc");
apiDoc.spec = rawYamlOrJsonString;
```

Use `<aui-openapi-renderer>` for raw OpenAPI documents. If the document is already parsed, use `<aui-asyncapi>` or `<aui-openapi>` and assign the object to its `spec` property.

See [Web Components](./docs/usage/with-webcomponents.md) for CDN usage, configuration, diagnostics, and framework integration.

## Development

This is a monorepo. The sections below are for contributors working on the library itself, skip these if you're just consuming the published package.

### Structure

```
packages/
  lib/            : the component library (published as "apiuikit")
  web-component/  : framework-agnostic custom elements (published as "@apiuikit/web-component")
  playground/     : local dev app that consumes the library as a real package would
  x-tensions/     : catalog of x-* spec-extension renderers, bundled into lib (see its own README)
```

### Commands

All commands run from the repo root.

#### Library

```bash
npm run build:lib    # build the library → packages/lib/dist/
npm run dev:lib      # start the library dev server (Vite)
npm run storybook    # run Storybook on localhost:6006
```

#### Playground

```bash
npm run build:lib    # required once before first run
npm run playground   # starts both the library watcher and the playground dev server
```

The library rebuilds automatically whenever you change a file in `packages/lib/src/`. Reload the playground tab to pick up the new build.

#### Web Components

```bash
npm run build:web-component   # builds packages/lib then packages/web-component → packages/web-component/dist/
npm run demo:wc                # builds both, then serves packages/web-component/demo/ on :8735
```

`@apiuikit/web-component` depends on `apiuikit` (the workspace package) and bundles it, along with React and ReactDOM, into a single self-contained build. Rebuild `packages/lib` first whenever you change its source.

### Publishing

Each package under `packages/` publishes independently. From `packages/lib/` or `packages/web-component/`:

```bash
npm publish          # runs prepublishOnly (vite build) automatically, then publishes
```

In this repo, releases are normally driven by [changesets](https://github.com/changesets/changesets) instead: run `npm run changeset` to record a change, and merging to `master` opens (or updates) a "Version Packages" PR; merging that PR triggers the `release` GitHub Action, which builds and publishes every package with a pending version bump.
