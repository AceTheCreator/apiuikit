# Usage — Without Parser

## Overview

Use this entry when you already have a resolved AsyncAPI document; for example, fetched from your own API, bundled at build time, or processed server-side. The `@asyncapi/parser` package is not required and will never be included in your bundle.

## `AsyncAPI` component

Pass a plain JavaScript object that matches the AsyncAPI 3.0 document shape.

### Props

| Prop      | Type                    | Required | Description                                         |
|-----------|-------------------------|----------|-----------------------------------------------------|
| `asyncapi`| `AsyncAPIDocumentData`  | Yes      | A pre-resolved AsyncAPI 3.0 document object         |
| `config`  | `ConfigInterface`       | No       | UI configuration (theme, show flags, sidebar, etc.). See [Configuration](../configuration/config.md). |
| `errorFallback` | `ReactNode \| (error, reset) => ReactNode` | No | Custom UI shown if rendering throws. Defaults to a built-in fallback |
| `onError` | `(error, errorInfo) => void` | No  | Called once when a render error is caught, e.g. to report it to your own telemetry |

### Error handling

The component wraps its own tree in an error boundary, so a render-time throw from a malformed or edge-case document is contained here instead of unmounting your application. The default fallback is an alert with the error message and a "Try again" button:

```tsx
<AsyncAPI
  asyncapi={doc}
  errorFallback={(error, reset) => <MyFallback message={error.message} onRetry={reset} />}
  onError={(error, errorInfo) => reportToSentry(error, errorInfo)}
/>
```

This only covers synchronous render errors, which is all a React error boundary can see. Parse failures surface through `AsyncAPIRenderer`'s `onDiagnostics` instead. The `ErrorBoundary` component is also exported on its own if you want to wrap composable sections in it.

### TypeScript

```tsx
import { AsyncAPI } from "apiuikit";
import type { ConfigInterface } from "apiuikit";
import doc from "./asyncapi.json";

const config: ConfigInterface = {
  show: { sidebar: true },
  theme: { mode: "dark" },
};

export default function App() {
  return <AsyncAPI asyncapi={doc} config={config} />;
}
```

### JavaScript

```jsx
import { AsyncAPI } from "apiuikit";
import doc from "./asyncapi.json";

export default function App() {
  return <AsyncAPI asyncapi={doc} />;
}
```

## Passing a parser-resolved document

If you run the AsyncAPI parser yourself upstream (e.g. in a build script or server), you can signal to the component that all `$ref`s have already been resolved:

```tsx
import { AsyncAPI } from "apiuikit";
import type { AsyncAPIDocumentData } from "apiuikit";

// document was fully dereferenced upstream
declare const resolvedDoc: AsyncAPIDocumentData;

export default function App() {
  return <AsyncAPI kind="resolved" asyncapi={resolvedDoc} />;
}
```

The `kind: "resolved"` variant uses the same `AsyncAPI` component, it is just a different prop shape that conveys the pre-resolved state.

Either way, the component verifies rather than trusts: documents are checked for `$ref`s with a cheap read-only scan, and a fully resolved document passes through untouched (no copy). If a document handed in as `kind="resolved"` still contains `$ref`s, they are resolved anyway and a console warning tells you the promise was false, so a broken upstream resolution step can't break the UI, but it also doesn't stay invisible.

## Multi-format schemas

Avro and Protobuf payloads and other multi-format wrappers are unwrapped (and converted) at render time. See [Avro schemas](./avro.md) and [Protobuf schemas](./protobuf.md) for more details.

## When to use this entry

| Scenario                                              | Use                      |
|-------------------------------------------------------|--------------------------|
| Document is a static JSON file bundled at build time  | `AsyncAPI` (no-parser)   |
| Document is fetched from your own backend (pre-parsed)| `AsyncAPI` (no-parser)   |
| Document is raw YAML/JSON entered by a user           | `AsyncAPIRenderer` or `parseAndRender` (see [with-parser](./with-parser.md)) |
| You run the parser yourself before rendering          | `AsyncAPI kind="resolved"` |
