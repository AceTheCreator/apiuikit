# Usage — Plugins

Plugins add external functionality from a separately-installed package into named slots on a rendered document. The code stays out of `apiuikit` itself, so consumers who don't want a feature (for example "try it out" / sending a real HTTP request) never ship it.

A plugin declares a `name` and which slot(s) it fills. Tab slots take `{ label, component }`; supplementary slots take a bare component:

```tsx
import { definePlugin } from "apiuikit/plugin";

export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.tab": { label: "Try it", component: MyOperationPanel },
  },
});
```

`name` is a human-readable identifier used in error and debug messages. It is not a registry key or a tab's internal selection id, so two plugins with the same `name` are still registered and selectable independently. Distinct names are nevertheless recommended so diagnostics identify the responsible plugin clearly.

You attach plugins with the `plugins` prop. apiuikit renders each registered plugin at the matching slot, wherever that slot appears.

## Using a plugin

Install the plugin package, then pass it to `plugins`. Keep the array's identity stable (module-level, or `useMemo`) — a new array literal every render re-registers plugins and can reset tab selection:

```tsx
import { OpenAPI } from "apiuikit";
import myPlugin from "@yourscope/apiuikit-plugin-whatever";
import "apiuikit/style.css";
import doc from "./openapi.json";

const plugins = [myPlugin];

export default function App() {
  return <OpenAPI openapi={doc} plugins={plugins} />;
}
```

Register as many as you like. They render in registration order wherever their slot(s) appear.

`plugins` is available on `OpenAPI`, `OpenAPIRenderer`, `AsyncAPI`, `AsyncAPIRenderer`, and on `OpenAPIProvider` / `AsyncAPIProvider` when composing your own layout (see [Composable Sections](./sections.md)):

```tsx
<OpenAPIProvider document={doc} plugins={plugins}>
  <OpenAPIServers />
  <OpenAPIEndpoints />
</OpenAPIProvider>
```

A section's standalone `document` prop form also accepts `plugins`. Composed under a provider, the provider's `plugins` apply instead and a section's own `plugins` prop is ignored — the same rule `config` already follows.

Plugins currently work only through the React API. `@apiuikit/web-component`'s custom elements don't support `plugins` yet: it's a live array of component references, not something a JSON/string attribute can carry.

The playground has two unpublished fixtures in `packages/playground/src/plugins/` (`operationTabDemoPlugin.tsx`, `operationSupplementaryDemoPlugin.tsx`) that only outline each slot's boundary. Writing a real plugin is covered below.

## Slots

Two shapes, distinguished by what they're filled with:

| Slot | Where it renders | Context | Filled with |
|---|---|---|---|
| `openapi.operation.tab` | A tab in the OpenAPI operation panel, alongside the built-in "Reference" tab | `OpenAPIOperationPluginContext` | `{ label, component }` |
| `asyncapi.operation.tab` | A tab in the AsyncAPI operation panel, alongside "Reference" | `AsyncAPIOperationPluginContext` | `{ label, component }` |
| `openapi.operation.reference.supplementary` | Inline, under each OpenAPI operation's documentation (after the code samples, before Authorization) | `OpenAPIOperationPluginContext` | bare component |
| `asyncapi.operation.reference.supplementary` | Inline, under each AsyncAPI operation's documentation (after the code sample) | `AsyncAPIOperationPluginContext` | bare component |

```ts
interface OpenAPIOperationPluginContext {
  document: OpenAPIDocumentData;
  method: HttpMethod;
  path: string; // the operation's key in document.paths — not the optional, often-absent operationId field
}

interface AsyncAPIOperationPluginContext {
  document: AsyncAPIDocumentData;
  operationId: string; // the operation's key in document.operations
}
```

Both shapes hand your component the whole document plus which operation this slot instance is for — not a pre-shaped bundle of parameters/requestBody/security. Look the operation up yourself and resolve whatever your plugin needs. That keeps the slot contract stable regardless of what a given plugin cares about:

```ts
const operation = document.paths?.[path]?.[method];           // OpenAPI
const operation = document.operations?.[operationId];        // AsyncAPI
```

If you still see `$ref`s, `useDocumentContext().deref` resolves a JSON Pointer against the ambient document.

A plugin may fill more than one slot (for example both OpenAPI and AsyncAPI tab slots, or a tab plus supplementary Reference content). Unfilled slots are simply omitted from `slots`.

More slots may be added over time; a plugin only needs to fill the ones it cares about.

### `*.operation.tab`

Selecting your tab hands you the operation panel's entire body. apiuikit's own documentation content is unmounted while your tab is active. The built-in "Reference" tab is always first; plugin tabs follow in registration order, each labeled with the `label` you gave it. Two plugins filling the same tab slot each get their own tab. Switching operations always lands back on Reference — a plugin's tab state does not carry over.

```tsx
export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.tab": { label: "Try it", component: MyOperationPanel },
  },
});
```

![The `openapi.operation.tab` slot, outlined in the playground: the "Demo" tab's content fills the whole operation panel body](./images/plugins/operation-tab-slot.png)

### `*.operation.reference.supplementary`

Your component renders at the documented supplementary point in the built-in Reference panel. Use this for small, secondary content that complements the operation documentation rather than replacing it. Multiple plugins filling the same supplementary slot render in registration order. It takes a bare component, not a `{ label, component }` pair:

```tsx
export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.reference.supplementary": MyInlineButton,
  },
});
```

![The `openapi.operation.reference.supplementary` slot, outlined in the playground: a small inline element sitting between the code samples and Authorization](./images/plugins/operation-supplementary-slot.png)

## Writing a plugin

`apiuikit/plugin` is a separate entry point from `apiuikit`, so plugin authors don't need to import from the main package's internals:

```ts
import { definePlugin } from "apiuikit/plugin";
import type { OpenAPIOperationPluginContext } from "apiuikit/plugin";
```

### Plugin-author exports

Most plugins only need `definePlugin` plus the context type for the slot they
fill. The rest of this table is useful when inspecting the document or reading
host configuration from inside that component.

| Export | What it's for |
|---|---|
| `definePlugin(plugin)` | Identity helper — returns the object as-is, typed as `ApiuikitPlugin`. |
| `ApiuikitPlugin` | The complete plugin object type, when `definePlugin` is not convenient. |
| `OpenAPIOperationPluginContext`, `AsyncAPIOperationPluginContext` | Props your slot component receives: the document plus which operation this instance is for. |
| `HttpMethod`, `OpenAPIDocumentData`, `OpenAPIOperationData`, `OpenAPIPathItemData`, `OpenAPIParameterData`, `OpenAPIRequestBodyData`, `OpenAPISecuritySchemeData`, `OpenAPIServerData` | OpenAPI document-shape types for resolving an operation out of `document`. |
| `AsyncAPIDocumentData` | AsyncAPI document-shape type for `document.operations[operationId]`. |
| `useDocumentContext()` | Ambient configuration and helpers such as `deref`; the operation document itself is already supplied in your component props. |
| `ConfigInterface`, `ThemeConfig`, `ThemeColors`, `ThemeColorScale`, `ThemeModeColors` | Types for the host's `config` prop, available as `useDocumentContext().config`. |

### Advanced: hosting plugin slots

You do not need these APIs to write a plugin. They are exported for custom UI
components that host APIUIKit plugins themselves:

- `PluginSlot`, `PluginSlotProps`, and `usePluginSlot`
- `useOperationTabPlugins` and `PluginTabEntry`
- `PluginSlotName`, `SupplementarySlotName`, and `TabSlotName`
- `PluginSlotContextMap`, `PluginSlotComponent<N>`, and `PluginTabSlotFill<N>`
- `useOpenAPIDocumentContext()` and `useAsyncAPIDocumentContext()` for hosts
  that require one specific document type

### A minimal tab component

```tsx
import { definePlugin } from "apiuikit/plugin";
import type { OpenAPIOperationPluginContext } from "apiuikit/plugin";

function MyOperationPanel({ document, method, path }: OpenAPIOperationPluginContext) {
  const operation = document.paths?.[path]?.[method];
  if (!operation) return null;
  return <div>{method.toUpperCase()} {path} — {operation.summary}</div>;
}

export default definePlugin({
  name: "my-plugin",
  slots: { "openapi.operation.tab": { label: "My Tab", component: MyOperationPanel } },
});
```

### Sending a request

Look up `parameters` / `requestBody` / `security` from the operation and build `fetch()` (or equivalent) in the plugin. This entry does not export a request builder: the helper code samples use is a snippet-oriented HAR object (auth placeholders, query string kept off the URL), not something a try-it panel should execute.

### Matching the host's theme

apiuikit resolves the host's `config.theme` (see [Configuration](../configuration/config.md)) into CSS custom properties on the document root: `--color-primary-{50,100,200,300,500,600,700}`, `--color-secondary-{...}`, `--color-neutral-{...}`, and the semantic `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` — each as `"r g b"` channel values. A plugin slot renders inside that tree, so these variables are already inherited. Reference them from your own styles (`rgb(var(--color-primary-600) / 1)`) instead of hardcoding colors:

```tsx
const sendButtonStyle = {
  background: "rgb(var(--color-primary-600) / 1)",
  border: "1px solid rgb(var(--color-border) / 1)",
  color: "#fff",
};
```

For anything beyond color (or to read the config the host actually passed, unresolved), `useDocumentContext().config` has the raw `ConfigInterface`. Prefer the derived fields on that same context (`showCodeSamples`, `deref`, …) over re-deriving them from `config`.

### Error isolation

Each plugin filling a slot is wrapped in its own error boundary and `Suspense` — one broken or slow-loading plugin can't take down the document, or a sibling plugin filling the same slot. A plugin that throws during render is skipped (no user-facing fallback) and logged as `[apiuikit] plugin error in slot "…":`. There is no user-facing fallback UI for a plugin crash today.

### Publishing

Ship it as its own package with `apiuikit` (and `react` / `react-dom`) as **peer dependencies**, not bundled in. Pin `apiuikit` to the major.minor you developed against:

```json
{
  "name": "@yourscope/apiuikit-plugin-whatever",
  "peerDependencies": {
    "apiuikit": "^1.5.0",
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

Mark `react`, `react-dom`, `react/jsx-runtime`, and `apiuikit` / `apiuikit/plugin` as external in your bundler config. This matters for more than bundle size: `apiuikit/plugin`'s `useDocumentContext` and `PluginSlot` are re-exported from the `apiuikit` package itself rather than bundled fresh, so every plugin's `DocumentContext` lookup resolves to the *same* context object the app's own `apiuikit` import provides. Bundling your own copy creates a second, disconnected instance — `useDocumentContext()` would then throw "must be used within a document provider" even when correctly nested under one, since React context lookups are keyed on object identity, not shape.

The playground's own demo plugins aren't packaged for publishing — they're dev fixtures for exercising the slot contract itself. Follow the package layout above for a shippable plugin.
