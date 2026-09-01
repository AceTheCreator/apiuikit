# Composable Sections Usage

## Overview

The `AsyncAPI` component renders a complete documentation page: sidebar, search, servers, operations, messages, schemas. If you want to build your own layout instead, render individual sections on their own, or compose several of them together.

## Rendering one section standalone

`AsyncAPIServers`, `AsyncAPIOperations`, `AsyncAPIMessages`, `AsyncAPISchemas`, and `AsyncAPIInfo` each render on their own. Pass a `document` and the section resolves it and sets up its own context internally, no provider needed.

```tsx
import { AsyncAPIOperations } from "apiuikit";
import doc from "./asyncapi.json";

export default function OperationsPage() {
  // Prefer layout="stacked" when embedding a section alone so it fills the
  // container width instead of reserving the empty right gutter used for
  // alignment in the full widget.
  return <AsyncAPIOperations document={doc} layout="stacked" />;
}
```

### Props

| Prop       | Type                         | Required | Description                                                  |
|------------|------------------------------|----------|----------------------------------------------------------------|
| `document` | `AsyncAPIDocumentData`       | Yes*     | A pre-resolved AsyncAPI 3.0 document. *Not required when rendered inside `AsyncAPIProvider` (see below). |
| `config`   | `ConfigInterface`            | No       | UI configuration. Only applied when the section sets up its own context (standalone); ignored when composed under a provider. |
| `plugins`  | `ApiuikitPlugin[]`           | No       | Third-party plugins. Only applied standalone; composed under `AsyncAPIProvider`, that provider's own `plugins` apply instead. See [Plugins](./plugins.md). |
| `layout`   | `"columns"` \| `"stacked"`   | No       | Column geometry. `"columns"` (default) keeps the reserved right gutter so sections align with AsyncAPIInfo/AsyncAPIServers in the full widget. `"stacked"` uses the full container width (no prose max-width), drops empty side space, and stacks AsyncAPIInfo/AsyncAPIServers side content below the main content. Prefer `"stacked"` when embedding a section alone. |

## Composing several sections

To arrange multiple sections together, reordering them or interleaving your own components between them, wrap them in `AsyncAPIProvider` instead of passing `document` to each one individually. It resolves the document once and shares it with every section underneath, rather than each one resolving independently.

```tsx
import { AsyncAPIProvider, AsyncAPIServers, AsyncAPIOperations, AsyncAPISchemas } from "apiuikit";
import doc from "./asyncapi.json";

export default function CustomLayout() {
  return (
    <AsyncAPIProvider document={doc}>
      <MyPageHeader />
      <AsyncAPIServers />
      <AsyncAPIOperations />
      <MyCustomSidebar />
      <AsyncAPISchemas />
    </AsyncAPIProvider>
  );
}
```

Sections rendered inside `AsyncAPIProvider` ignore their own `document`/`config` props and read from the shared context instead.

## Replacing a section with your own component

Because composition doesn't rely on a slot API, dropping in a custom implementation for one part is just a matter of not using the built-in component for it:

```tsx
<AsyncAPIProvider document={doc}>
  <AsyncAPIServers />
  <MyCustomOperationsList />  {/* reads useAsyncAPIDocument() itself */}
  <AsyncAPISchemas />
</AsyncAPIProvider>
```

Any component rendered inside `AsyncAPIProvider` can call `useAsyncAPIDocument()` to read the resolved document, the same way the built-in sections do.

## Error handling

Unlike `AsyncAPI` and `OpenAPI`, which wrap themselves in an error boundary, sections and providers render unwrapped. That's deliberate: you're building the layout, so where a failure should be contained (and what should show in its place) is your call, not the library's. A boundary the library forced around every section would also mean a malformed schema quietly renders a fallback card in the middle of your page, which may not be what you want.

The `ErrorBoundary` used by the full-page components is exported, so opt in wherever it suits your layout. Around everything, so one bad section doesn't take the page down:

```tsx
import { ErrorBoundary, AsyncAPIProvider, AsyncAPIServers, AsyncAPIOperations, AsyncAPISchemas } from "apiuikit";

<ErrorBoundary onError={(error, errorInfo) => reportToSentry(error, errorInfo)}>
  <AsyncAPIProvider document={doc}>
    <AsyncAPIServers />
    <AsyncAPIOperations />
    <AsyncAPISchemas />
  </AsyncAPIProvider>
</ErrorBoundary>
```

Or around a single section, so the rest of the page survives it:

```tsx
<AsyncAPIProvider document={doc}>
  <AsyncAPIServers />
  <ErrorBoundary fallback={<p>Couldn't render operations.</p>}>
    <AsyncAPIOperations />
  </ErrorBoundary>
  <AsyncAPISchemas />
</AsyncAPIProvider>
```

### `ErrorBoundary` props

| Prop       | Type                                        | Required | Description                                                        |
|------------|---------------------------------------------|----------|--------------------------------------------------------------------|
| `children` | `ReactNode`                                 | Yes      | The tree to protect                                                |
| `fallback` | `ReactNode \| (error, reset) => ReactNode`  | No       | UI shown after a caught error. Defaults to an alert with the message and a "Try again" button. The function form gets `reset`, which clears the error and re-renders the children |
| `onError`  | `(error, errorInfo) => void`                | No       | Called once when an error is caught, in addition to the library's own `console.error` |

Placement matters: React only catches errors thrown by a boundary's *descendants*. A section that resolves its document during its own render is covered only if the boundary sits above it, as in both examples here. Wrapping content *inside* a section doesn't protect that section.

This covers synchronous render errors, which is all a React error boundary can see. Failures while parsing a raw document surface through `AsyncAPIRenderer`'s `onDiagnostics` instead.

## When to use this entry

| Scenario                                                        | Use                                  |
|-------------------------------------------------------------------|---------------------------------------|
| Want the full documentation page, sidebar and search included   | `AsyncAPI` (see [no-parser](./no-parser.md) / [with-parser](./with-parser.md)) |
| Want one section in a page you're already building              | A standalone section, e.g. `<AsyncAPIOperations document={doc} />` |
| Want several sections in a custom layout                        | `AsyncAPIProvider` wrapping multiple sections |
| Want to replace one section with your own implementation         | `AsyncAPIProvider` + your component in place of the built-in one |
