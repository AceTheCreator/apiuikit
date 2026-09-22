# apiuikit

[![npm version](https://img.shields.io/npm/v/apiuikit.svg?label=apiuikit)](https://www.npmjs.com/package/apiuikit)
[![npm downloads](https://img.shields.io/npm/dm/apiuikit.svg)](https://www.npmjs.com/package/apiuikit)
[![npm version](https://img.shields.io/npm/v/@apiuikit/web-component.svg?label=%40apiuikit%2Fweb-component)](https://www.npmjs.com/package/@apiuikit/web-component)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Website](https://img.shields.io/badge/website-apiuikit.com-1473FF.svg)](https://apiuikit.com)

React component library for rendering API specifications. Point it at an AsyncAPI or OpenAPI document and get a full interactive UI, which includes: servers, channels/endpoints, operations, messages, schemas, with no manual mapping required.

**[▶ Try it out in the Playground](https://playground.apiuikit.com)**

> **Spec compatibility:** apiuikit renders AsyncAPI 3.x and OpenAPI 3.0/3.1
> documents. Version compatibility does not imply that every specification
> keyword has a dedicated UI; see [OpenAPI coverage](./docs/usage/openapi.md#coverage)
> for the exact rendered features and deliberate limits.

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
import { AsyncAPIOperations } from "apiuikit";
import doc from "./asyncapi.json";

export default function OperationsPage() {
  return <AsyncAPIOperations document={doc} />;
}
```

`AsyncAPIServers`, `AsyncAPIOperations`, `AsyncAPIMessages`, and `AsyncAPIInfo` all work this way (OpenAPI equivalents: `OpenAPIServers`, `OpenAPIEndpoints`, `OpenAPIInfo`), as does `Schemas`, which is shared by both specs. To arrange several of them together, wrap them in `AsyncAPIProvider` (or `OpenAPIProvider`) instead so the document is resolved once and shared:

```tsx
import { AsyncAPIProvider, AsyncAPIServers, AsyncAPIOperations, Schemas } from "apiuikit";

export default function CustomLayout() {
  return (
    <AsyncAPIProvider document={doc}>
      <AsyncAPIServers />
      <AsyncAPIOperations />
      <Schemas />
    </AsyncAPIProvider>
  );
}
```

See the full usage docs for props, configuration options, and more:

- [Without Parser](./docs/usage/no-parser.md) (`AsyncAPI` component)
- [With Parser](./docs/usage/with-parser.md) (`AsyncAPIRenderer` component, `parseAndRender` utility)
- [Composable Sections](./docs/usage/sections.md) (`AsyncAPIServers`, `AsyncAPIOperations`, `AsyncAPIMessages`, `Schemas`, `AsyncAPIInfo`, `AsyncAPIProvider`)
- [Configuration](./docs/configuration/config.md) (`ConfigInterface`: theme, show flags, sidebar, sidePanel, etc.)
- [Web Components](./docs/usage/with-webcomponents.md) (`<apiuikit-asyncapi>`, `<apiuikit-asyncapi-renderer>`, use apiuikit from any framework)
- [Plugins](./docs/usage/plugins.md) (`plugins` prop, `definePlugin`, writing and publishing your own)
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
<apiuikit-asyncapi-renderer id="api-doc"></apiuikit-asyncapi-renderer>
```

```js
import "@apiuikit/web-component";
import "@apiuikit/web-component/style.css";

const apiDoc = document.querySelector("#api-doc");
apiDoc.spec = rawYamlOrJsonString;
```

Use `<apiuikit-openapi-renderer>` for raw OpenAPI documents. If the document is already parsed, use `<apiuikit-asyncapi>` or `<apiuikit-openapi>` and assign the object to its `spec` property.

See [Web Components](./docs/usage/with-webcomponents.md) for CDN usage, configuration, diagnostics, and framework integration.

## Plugins

Extend a rendered document with UI from a separately-installed package, without that code living in `apiuikit`'s own bundle — e.g. a "Try it" tab on OpenAPI operations for sending real requests:

```tsx
import { OpenAPI } from "apiuikit";
import myPlugin from "@yourscope/apiuikit-plugin-whatever";

<OpenAPI openapi={doc} plugins={[myPlugin]} />
```

See [Plugins](./docs/usage/plugins.md) for the full reference, including how to write and publish your own.

## Contributing

This is a monorepo. To work on the library itself (setup, playground, Storybook, tests, PRs, releases), see [CONTRIBUTING.md](./CONTRIBUTING.md).
