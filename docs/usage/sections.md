# Composable Sections Usage

## Overview

The `AsyncAPI` component renders a complete documentation page: sidebar, search, servers, operations, messages, schemas. If you want to build your own layout instead, render individual sections on their own, or compose several of them together.

## Rendering one section standalone

`Servers`, `Operations`, `Messages`, `Schemas`, and `Info` each render on their own. Pass a `document` and the section resolves it and sets up its own context internally, no provider needed.

```tsx
import { Operations } from "apiuikit";
import doc from "./asyncapi.json";

export default function OperationsPage() {
  return <Operations document={doc} />;
}
```

### Props

| Prop       | Type                    | Required | Description                                                  |
|------------|-------------------------|----------|----------------------------------------------------------------|
| `document` | `AsyncAPIDocumentData`  | Yes*     | A pre-resolved AsyncAPI 3.0 document. *Not required when rendered inside `AsyncAPIProvider` (see below). |
| `config`   | `ConfigInterface`       | No       | UI configuration. Only applied when the section sets up its own context (standalone); ignored when composed under a provider. |

## Composing several sections

To arrange multiple sections together, reordering them or interleaving your own components between them, wrap them in `AsyncAPIProvider` instead of passing `document` to each one individually. It resolves the document once and shares it with every section underneath, rather than each one resolving independently.

```tsx
import { AsyncAPIProvider, Servers, Operations, Schemas } from "apiuikit";
import doc from "./asyncapi.json";

export default function CustomLayout() {
  return (
    <AsyncAPIProvider document={doc}>
      <MyPageHeader />
      <Servers />
      <Operations />
      <MyCustomSidebar />
      <Schemas />
    </AsyncAPIProvider>
  );
}
```

Sections rendered inside `AsyncAPIProvider` ignore their own `document`/`config` props and read from the shared context instead.

## Replacing a section with your own component

Because composition doesn't rely on a slot API, dropping in a custom implementation for one part is just a matter of not using the built-in component for it:

```tsx
<AsyncAPIProvider document={doc}>
  <Servers />
  <MyCustomOperationsList />  {/* reads useAsyncAPIDocument() itself */}
  <Schemas />
</AsyncAPIProvider>
```

Any component rendered inside `AsyncAPIProvider` can call `useAsyncAPIDocument()` to read the resolved document, the same way the built-in sections do.

## When to use this entry

| Scenario                                                        | Use                                  |
|-------------------------------------------------------------------|---------------------------------------|
| Want the full documentation page, sidebar and search included   | `AsyncAPI` (see [no-parser](./no-parser.md) / [with-parser](./with-parser.md)) |
| Want one section in a page you're already building              | A standalone section, e.g. `<Operations document={doc} />` |
| Want several sections in a custom layout                        | `AsyncAPIProvider` wrapping multiple sections |
| Want to replace one section with your own implementation         | `AsyncAPIProvider` + your component in place of the built-in one |
