# Usage — With Parser

## Overview

The parser entry accepts a raw AsyncAPI YAML or JSON string, validates it, and renders the UI. The `@asyncapi/parser` package is loaded on demand via a dynamic import so it never lands in your bundle unless this path is used.

## Prerequisites

Install the peer dependency:

```bash
npm install @asyncapi/parser
```

## `AsyncAPIRenderer` component

The simplest way to use the parser entry. Pass a raw string and the component handles the async parse-and-render cycle internally.

### Props

| Prop             | Type                            | Required | Description                                          |
|------------------|---------------------------------|----------|------------------------------------------------------|
| `raw`            | `string`                        | Yes      | Raw AsyncAPI document — YAML or JSON                 |
| `config`         | `ConfigInterface`               | No       | UI configuration (theme, show flags, sidebar, etc.). See [Configuration](../configuration/config.md).  |
| `plugins`        | `ApiuikitPlugin[]`              | No       | Third-party plugins to render into the document's extension slots. See [Plugins](./plugins.md). |
| `onDiagnostics`  | `(d: unknown[]) => void`        | No       | Called after parsing with any validation diagnostics |
| `errorFallback`  | `ReactNode \| (error, reset) => ReactNode` | No | Forwarded to `AsyncAPI`: custom UI shown if rendering throws |
| `onError`        | `(error, errorInfo) => void`    | No       | Forwarded to `AsyncAPI`: called once when a render error is caught |

Parse failures and render failures are separate channels: `onDiagnostics` reports parser errors and warnings, `onError` reports a throw during render. See [Error handling](./no-parser.md#error-handling).

Validation errors do not automatically block rendering. The parser continues reference resolution, trait application, and Avro/Protobuf conversion while retaining diagnostics. The library sends diagnostics through `onDiagnostics`; your application decides how to display them.

Unreadable input, unsupported versions, and failures during document transformation may still produce no document. Render-time section failures are contained so other sections remain accessible, and changing the document retries rendering.

### TypeScript

```tsx
import { AsyncAPIRenderer } from "apiuikit";

export default function App() {
  return (
    <AsyncAPIRenderer
      raw={rawYaml}
      onDiagnostics={(diagnostics) => console.log(diagnostics)}
    />
  );
}
```

### JavaScript

```jsx
import { AsyncAPIRenderer } from "apiuikit";

export default function App() {
  return <AsyncAPIRenderer raw={rawYaml} />;
}
```

## `parseAndRender` utility

Use this when you need access to diagnostics before deciding whether to render, or when you want to control the render yourself.

### Signature

```ts
function parseAndRender(
  raw: string,
  config?: ConfigInterface,
): Promise<{ diagnostics: unknown[]; view: React.ReactElement | null }>
```

- **`diagnostics`**: validation issues returned by the parser. An empty array means the document is valid.
- **`view`**: a ready-to-mount React element, or `null` if parsing or document transformation could not produce a usable document.

### TypeScript

```tsx
import { parseAndRender } from "apiuikit";
import type { ConfigInterface } from "apiuikit";

const config: ConfigInterface = {
  show: { schemas: false },
  theme: { mode: "dark" },
};

const { diagnostics, view } = await parseAndRender(rawYaml, config);

if (diagnostics.length) {
  console.warn("Validation issues:", diagnostics);
}

// view is null when the parser cannot produce a usable document
export default function App() {
  return view ?? <p>Invalid AsyncAPI document.</p>;
}
```

### JavaScript

```jsx
import { parseAndRender } from "apiuikit";

const { diagnostics, view } = await parseAndRender(rawYaml);

export default function App() {
  return view ?? <p>Invalid AsyncAPI document.</p>;
}
```

## Multi-format schemas

Avro payloads (`schemaFormat: application/vnd.apache.avro…`) and Protobuf payloads (`schemaFormat: application/vnd.google.protobuf…`) are supported out of the box — no extra install. See [Avro schemas](./avro.md) and [Protobuf schemas](./protobuf.md) for more details.

## Error handling

If `@asyncapi/parser` is not installed, `parseAndRender` (and by extension `AsyncAPIRenderer`) throws a readable error at call time:

```
[apiuikit] The parsed entry requires '@asyncapi/parser'.
Install it (`npm i @asyncapi/parser`), or use the `AsyncAPI` component with a pre-resolved document instead.
```
