# x-tensions

Internal catalog of API spec-extension (`x-*`) renderers for [apiuikit](../../README.md). Bundled into `packages/lib` at build time, never published on its own.

## What this is

AsyncAPI and OpenAPI documents can carry arbitrary `x-*` fields (spec extensions) for vendor- or tool-specific data: a company logo, a social handle, whatever a document author wants to attach. This package is the registry of which `x-*` fields apiuikit knows how to render, and how.

## How it's consumed

`packages/lib`'s `RenderExtensions` component sweeps an object's own keys, matches any that both start with `x-` and exist in `catalog`, and lazily renders them:

```ts
export const catalog: ExtensionCatalog = {
  "x-x": () => import("./extensions/XExtension"),
  "x-linkedin": () => import("./extensions/LinkedInExtension"),
};
```

Each catalog value is a *loader*, not the component itself. `RenderExtensions` wraps it in `React.lazy`, so an extension's code only ships to the browser once its key actually shows up in a rendered document.

Unmatched `x-*` keys render nothing. Two prefixes are reserved for apiuikit's own bookkeeping and are never routed here: `x-parser-*` (the AsyncAPI parser) and `x-lib-*` (internal apiuikit markers).

### Extensions with a fixed placement

Not every extension fits the generic icon-row treatment `RenderExtensions` gives `catalog` entries. `x-logo`, for example, renders at a specific spot (the top of the Info metadata section) rather than being swept up generically, so it's exported as its own loader instead of living in `catalog`:

```ts
export const logoLoader: ExtensionLoader = () => import("./extensions/LogoExtension");
```

The consuming component (`Information`/`InfoMetadata` in `packages/lib`) imports `logoLoader` directly and decides where to mount it.

## Adding a new extension

1. Create `src/extensions/<Name>Extension.tsx`, default-exporting a component typed `ExtensionComponent` (props: `value: unknown`, `path: string`). Validate `value` yourself and return `null` if it doesn't look right: a malformed `x-*` field should render nothing, not throw.
2. If it belongs in the generic icon row, add it to `catalog` in `src/index.ts`. If it needs its own placement (like `x-logo`), export its own loader instead and wire the placement up in `packages/lib`.
3. If your component uses Tailwind classes, note that this package isn't scanned by Tailwind on its own. `packages/lib/tailwind.config.js`'s `content` array has to include this package's `src/**` (it already does). Skipping that means a class you use only here silently never gets generated CSS.

## Current extensions

| Field | Renders |
|---|---|
| `x-x` | `info.x-x` as an X (Twitter) profile icon link |
| `x-linkedin` | `info.x-linkedin` as a LinkedIn icon link (expects a full URL) |
| `x-logo` | `info.x-logo` as an image, accepts a bare URL string, or a ReDoc-style `{url, altText, backgroundColor}` object |
