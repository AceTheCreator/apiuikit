# Plugins

Plugins add external functionality to a rendered document from a separately-installed package, without that code living in (or bloating) `apiuikit` itself. The motivating example is "try it out": sending a real HTTP request for an OpenAPI operation is a feature many consumers want, but forcing every consumer to ship that code even when they don't isn't a good tradeoff.

A plugin names which slot it fills and which component renders there:

```tsx
import { definePlugin } from "apiuikit/plugin";

export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.tab": { label: "Try it", component: MyOperationPanel },
  },
});
```

You attach plugins with the `plugins` prop. apiuikit renders each registered plugin at the matching slot, wherever that slot appears.

## Using a plugin

Install whichever plugin package you're using, then pass it to `plugins`:

```tsx
import { OpenAPI } from "apiuikit";
import myPlugin from "@yourscope/apiuikit-plugin-whatever";
import "apiuikit/style.css";
import doc from "./openapi.json";

export default function App() {
  return <OpenAPI openapi={doc} plugins={[myPlugin]} />;
}
```

`plugins` is an array — register as many as you like. They render in registration order wherever their slot(s) appear. Keep the array's identity stable across renders (module-level, or memoized) rather than passing a new array literal every render.

It's available on `OpenAPI`, `OpenAPIRenderer`, `AsyncAPI`, `AsyncAPIRenderer`, and on `OpenAPIProvider` / `AsyncAPIProvider` when composing your own layout (see [Composable Sections](./sections.md)):

```tsx
<OpenAPIProvider document={doc} plugins={[myPlugin]}>
  <OpenAPIServers />
  <OpenAPIEndpoints />
</OpenAPIProvider>
```

A section's standalone `document` prop form also accepts `plugins`. Composed under a provider, the provider's `plugins` apply instead and a section's own `plugins` prop is ignored — the same rule `config` already follows.

Plugins currently work only through the React API. `@apiuikit/web-component`'s custom elements don't support `plugins` yet: it's a live array of component references, not something a JSON/string attribute can carry.

The playground ships two small, non-published dev fixtures for exercising the plugin architecture in `packages/playground/src/plugins/`: `operationTabDemoPlugin.tsx` fills `openapi.operation.tab`, and `operationActionsDemoPlugin.tsx` fills `openapi.operation.actions`. Neither does anything functional — each just renders a labeled placeholder, outlined so its slot's boundary is visible while clicking around the playground (see the screenshots below). Building an actual "try it out" plugin — one that edits parameters/body and sends a real `fetch()` — is covered below, under "Writing a plugin"; apiuikit doesn't ship a full one itself.

## Slots

Two shapes, distinguished by what they're filled with:

| Slot | Where it renders | Context | Filled with |
|---|---|---|---|
| `openapi.operation.tab` | A tab in the OpenAPI operation panel, alongside the built-in "Reference" tab | `OpenAPIOperationActionsContext` | `{ label, component }` |
| `asyncapi.operation.tab` | A tab in the AsyncAPI operation panel, alongside "Reference" | `AsyncAPIOperationActionsContext` | `{ label, component }` |
| `openapi.operation.actions` | Inline, under each OpenAPI operation's documentation (after the code samples, before Authorization) | `OpenAPIOperationActionsContext` | bare component |
| `asyncapi.operation.actions` | Inline, under each AsyncAPI operation's documentation (after the code sample) | `AsyncAPIOperationActionsContext` | bare component |

```ts
interface OpenAPIOperationActionsContext {
  document: OpenAPIDocumentData;
  method: HttpMethod;
  path: string; // the operation's key in document.paths — not the optional, often-absent operationId field
}

interface AsyncAPIOperationActionsContext {
  document: AsyncAPIDocumentData;
  operationId: string; // the operation's key in document.operations
}
```

Both shapes hand your component the whole document plus which operation this slot instance is for — not a pre-shaped bundle of parameters/requestBody/security. Look the operation up yourself (`document.paths[path][method]` for OpenAPI, `document.operations[operationId]` for AsyncAPI) and resolve whatever your plugin needs. That keeps the slot contract stable regardless of what a given plugin cares about.

**`*.operation.tab`** is what most plugins want: selecting your tab hands you the operation panel's entire body. apiuikit's own documentation content is unmounted while your tab is active. The built-in "Reference" tab is always first; plugin tabs follow in registration order, each labeled with the `label` you gave it. Two plugins filling the same tab slot each get their own tab. Switching operations always lands back on Reference — a plugin's tab state doesn't carry over.

```tsx
export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.tab": { label: "Try it", component: MyOperationPanel },
  },
});
```

The playground's `operationTabDemoPlugin.tsx` outlines its own wrapper in a tinted, thick dotted border so it's obvious in a screenshot exactly how much space this slot hands you — the operation panel's *entire* body, not just the room its own content happens to need:

![The `openapi.operation.tab` slot, outlined in the playground: the "Demo" tab's content fills the whole operation panel body](./images/plugins/operation-tab-slot.png)

**`*.operation.actions`** is inline instead — your component renders alongside apiuikit's own content. Use this only for something small and secondary (e.g. a button) that belongs next to the documentation rather than replacing it. Multiple plugins filling the same actions slot stack in registration order. It takes a bare component, not a `{ label, component }` pair.

```tsx
export default definePlugin({
  name: "my-plugin",
  slots: {
    "openapi.operation.actions": MyInlineButton,
  },
});
```

The playground also has a small `operationActionsDemoPlugin.tsx` fixture filling this slot, outlined the same way, to make the contrast with `*.operation.tab` obvious — inline, amid the existing content, not a full panel:

![The `openapi.operation.actions` slot, outlined in the playground: a small inline element sitting between the code samples and Authorization](./images/plugins/operation-actions-slot.png)

More slots may be added over time; a plugin only needs to fill the ones it cares about.

## Writing a plugin

`apiuikit/plugin` is a separate entry point from `apiuikit`, so plugin authors don't need to import from the main package's internals:

```ts
import { definePlugin, buildHarRequest } from "apiuikit/plugin";
import type { OpenAPIOperationActionsContext } from "apiuikit/plugin";
```

| Export | What it's for |
|---|---|
| `definePlugin(plugin)` | Identity helper — returns the object as-is, typed as `ApiuikitPlugin`. |
| `ApiuikitPlugin`, `PluginSlotName`, `PluginSlotContextMap`, `PluginSlotComponent<N>` | Types for the plugin object and each slot's context. |
| `TabSlotName`, `PluginTabSlotFill<N>` | The `*.operation.tab` slot names, and the `{ label, component }` shape they're filled with. |
| `HttpMethod`, `OpenAPIOperationData`, `OpenAPIPathItemData`, `OpenAPIParameterData`, `OpenAPIRequestBodyData`, `OpenAPISecuritySchemeData`, `OpenAPIServerData` | Document-shape types for resolving an operation out of the `document` a slot context hands you. |
| `useDocumentContext()` / `useAsyncAPIDocument()` | Ambient context (deref, theme/config-derived settings). You don't need this for the document itself — that's already on the slot context. Same hook, two names. |
| `ConfigInterface`, `ThemeConfig`, `ThemeColors`, `ThemeColorScale`, `ThemeModeColors` | Types for the host's `config` prop, available as `useDocumentContext().config`. |
| `buildHarRequest(...)`, `resolveServerBaseUrl(...)` | The same HAR-request builder `CodeSamples` uses: server URL templating, path/query substitution, auth placeholders. Call it once you've looked up the operation. |

`PluginSlot`, `usePluginSlot`, and `useOperationTabPlugins` are also exported. A plugin component doesn't need them — they're for something that itself hosts plugin slots (e.g. a custom operation panel).

A minimal tab component:

```tsx
import type { OpenAPIOperationActionsContext } from "apiuikit/plugin";

function MyOperationPanel({ document, method, path }: OpenAPIOperationActionsContext) {
  const operation = document.paths?.[path]?.[method];
  if (!operation) return null;
  return <div>{method.toUpperCase()} {path} — {operation.summary}</div>;
}

export default definePlugin({
  name: "my-plugin",
  slots: { "openapi.operation.tab": { label: "My Tab", component: MyOperationPanel } },
});
```

A plugin that needs to send a request resolves the operation's `parameters` / `requestBody` / `security` from `document`, then hands them to `buildHarRequest`:

```tsx
import { buildHarRequest } from "apiuikit/plugin";
import type { OpenAPIOperationActionsContext } from "apiuikit/plugin";

function MyOperationPanel({ document, method, path }: OpenAPIOperationActionsContext) {
  const operation = document.paths?.[path]?.[method];
  if (!operation) return null;

  const harRequest = buildHarRequest({
    method,
    path,
    servers: document.servers,
    parameters: operation.parameters ?? [],
    security: operation.security ?? document.security ?? [],
    securitySchemes: document.components?.securitySchemes,
    media: null,
    resolvedBodyValue: undefined,
  });
  // fetch(harRequest.url, { method: harRequest.method, ... })
}
```

### Matching the host's theme

apiuikit resolves the host's `config.theme` (see [Configuration](../configuration/config.md)) into CSS custom properties on the document root: `--color-primary-{50,100,200,300,500,600,700}`, `--color-secondary-{...}`, `--color-neutral-{...}`, and the semantic `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` — each as `"r g b"` channel values. A plugin slot renders inside that tree, so these variables are already inherited. Reference them from your own styles (`rgb(var(--color-primary-600) / 1)`) instead of hardcoding colors:

```tsx
const sendButtonStyle = {
  background: "rgb(var(--color-primary-600) / 1)",
  border: "1px solid rgb(var(--color-border) / 1)",
  color: "#fff",
};
```

For anything beyond color (or to read the config the host actually passed, unresolved), `useDocumentContext().config` has the raw `ConfigInterface`.

### Error isolation

Each plugin filling a slot is wrapped in its own error boundary and `Suspense` — one broken or slow-loading plugin can't take down the document, or a sibling plugin filling the same slot. A plugin that throws during render is silently skipped (logged to the console) rather than shown; there's no user-facing fallback UI for a plugin crash today.

### Publishing

Ship it as its own package with `apiuikit` (and `react` / `react-dom`) as **peer dependencies**, not bundled in:

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

The playground's own `operationTabDemoPlugin.tsx` and `operationActionsDemoPlugin.tsx` aren't packaged for publishing — they're dev fixtures for exercising the slot contract itself, not examples of a shippable plugin. Follow the package layout above for that.
