# apiuikit

## 1.9.0

### Minor Changes

- e545e4c: Add `theme.mode` (`"light" | "dark" | "system"`) so the library switches between `theme.light` and `theme.dark` itself, instead of requiring consumers to rebuild the `theme` config object every time their own toggle changes. `"system"` follows the OS `prefers-color-scheme` setting live. Left unset, `mode` preserves prior behavior exactly — whichever single one of `light`/`dark` you provided is used, with `light` winning if you provided both (or neither) — so existing configs render unchanged.

## 1.8.3

### Patch Changes

- 6a635b4: Fix the compact sidebar navigation toggle (the floating circular button shown when the widget is too narrow for the tick "spine") detaching from its bounded preview pane — the same `position: fixed` viewport-relative math already fixed for the document toolbar. The button now sits in a `position: sticky` anchor instead, so it stays bottom-right of the widget's own pane rather than the true browser viewport; the popover it opens now reads its position from the button's own measured on-screen rect instead of recomputing it independently, so the two can't drift out of sync.
- 44ded5c: Fix the document toolbar (search + "Copy as Markdown") still detaching from its bounded preview pane in some scroll combinations after the 1.8.2 fix — most visibly when scrolling back up past where the pane's own top had scrolled offscreen, which pinned the toolbar to the true viewport top and let it overlap the document's own heading. The previous fix computed the toolbar's `position: fixed` coordinates in JS from the nearest scrolling ancestor's rect, which can't account for every combination of outer-page scroll, an ancestor's own scroll, and a host's fixed navbar at once. The toolbar now uses CSS `position: sticky` instead, so the browser resolves its position against whichever ancestor is actually scrolling every frame, with no JS geometry math and no drift.
- d866aeb: Fix the document toolbar's empty middle space (between the logo and the search/Copy-as-Markdown controls) painting an opaque background that obscured document content scrolling underneath it. That background came from a row spanning the toolbar's full width, painted even where there was nothing to show — the search and Copy as Markdown buttons already carry their own background for legibility, so the row itself is now transparent.

## 1.8.2

### Patch Changes

- 32b5b40: Fix the document toolbar (search + "Copy as Markdown") pinning to the true browser viewport instead of the widget's own scrollable container when the widget is embedded in a bounded, independently-scrolling pane elsewhere on a host page (e.g. a settings-page preview). Scrolling inside such a pane moved the widget root's own rect deeply negative even though the pane itself hadn't moved, so the toolbar snapped to the top of the browser window instead of staying pinned to the pane's visible top edge. The toolbar now anchors to the nearest ancestor that's actually clipping/scrolling the widget, when one exists.

## 1.8.1

### Patch Changes

- 376d7d1: Fix `ReferenceError: self is not defined` when server-rendering apiuikit's components under Next.js (or any Node-based SSR). `isomorphic-dompurify` was being bundled into apiuikit's dist output, which locked in its browser-only implementation (an unguarded `self.DOMPurify` reference) at build time regardless of the environment actually loading it. It's now left external so each consumer's own bundler resolves the correct Node vs. browser implementation.

## 1.8.0

### Minor Changes

- cc6b149: Merge `AsyncAPISchemas` and `OpenAPISchemas` into a single spec-agnostic `Schemas` section. `components.schemas` has the identical shape in both document types and the section reads nothing else off the document, so the two variants only differed in which provider they set up and in a spec-mismatch warning that had nothing to warn about. `Schemas` accepts either document standalone (picking a provider from the document's own version key) and renders under an ambient provider of either spec type. The old names remain exported as deprecated aliases.

## 1.7.0

### Minor Changes

- 2a4e80f: Add a plugin architecture so hosts can extend a rendered document from a separately-installed package: `plugins` on `OpenAPI` / `AsyncAPI` (and providers/sections), a dedicated `apiuikit/plugin` entry (`definePlugin`, slot types, document-context hooks), and operation tab/actions slots. Custom elements do not accept `plugins` yet.

## 1.6.1

### Patch Changes

- 3637d2d: Add bottom spacing to the section wrapper so Operations and Endpoints tables no longer sit flush against content that follows them (e.g. a page footer) in standalone embeds.

## 1.6.0

### Minor Changes

- 094db5a: Rename the standalone AsyncAPI section exports to carry an `AsyncAPI` prefix, matching the existing OpenAPI equivalents: `Servers` → `AsyncAPIServers`, `Operations` → `AsyncAPIOperations`, `Messages` → `AsyncAPIMessages`, `Schemas` → `AsyncAPISchemas`, `Info` → `AsyncAPIInfo`. The old generic names were easy to confuse with their OpenAPI counterparts (`OpenAPIServers`, `OpenAPIInfo`, etc.); update imports from `apiuikit` accordingly.

## 1.5.3

### Patch Changes

- 31f1dfb: Fix responsive layout issues in the Operations table, Messages table, and Authorization dropdown: the Operations row no longer wastes space on a dead spacer column next to the method badge, the Messages table now scrolls horizontally instead of clipping its Details column, and the shared Tabs mobile `<select>` (used by Authorization and elsewhere) is now styled to match the rest of the design system instead of rendering as a bare native dropdown.

## 1.5.2

### Patch Changes

- 3644b18: Restore tab dividers and structural spacing after CSS isolation, and keep AsyncAPI operation content consistently spaced.

## 1.5.1

### Patch Changes

- b75a103: Isolate APIUIkit's Tailwind utilities and resets from host styles, add a widget-wide top offset for host navigation, improve contained side-panel and sticky-tab behavior, keep search available independently of sidebar visibility, unify document branding and search/Markdown actions in a responsive scrolling top bar, improve responsive information-title placement, and improve Markdown contrast across themes.

## 1.5.0

### Minor Changes

- Integrate `asyncsnippet` for AsyncAPI operation code samples (multi-language clients filtered by protocol), and replace the OpenAPI "Copy Markdown" control with an Agent Prompt sample via the existing `agent:prompt` entry backed by `openApiEndpointToMarkdown`.

## 1.4.0

### Minor Changes

- 4e755c6: Add a per-section `layout` prop (`"columns"` | `"stacked"`) on modular AsyncAPI and OpenAPI section components. Default `"columns"` keeps the reserved right gutter; `"stacked"` uses the full container width (no prose max-width), drops empty side space, and stacks Info/Servers side content below the main content.
- 4e755c6: Add `config.sidePanel.containment` (`"component"` | `"viewport"`) so SidePanel overlays can either clip to the widget's root element or cover the full browser viewport. The default remains `"viewport"` for backward compatibility; use `"component"` for contained embeds and section components.

### Patch Changes

- 4e755c6: Fix a hairline visible at the closed SidePanel's edge: `shadow-xl`'s blurred box-shadow was bleeding past the portal overlay's `overflow: hidden` clip even while the panel was translated off-screen. The shadow is now only applied while the panel is open.

## 1.3.0

### Minor Changes

- 463d671: Fix SidePanel not sliding fully off-screen when closed

## 1.2.0

### Minor Changes

- 0ea5049: Add `config.markdown.url`, pointing "View as Markdown" at a real hosted URL instead of a throwaway `blob:` URL, which is revoked on reload, can't be shared, and is invisible to crawlers and AI agents. Accepts a string, or a resolver that receives the target and can return `null` to keep the blob fallback for documents you don't serve.

  Add spec-agnostic helpers for publishing an AI-discoverable docs site, so a site built with apiuikit can be read by agents and crawlers rather than only in a browser:

  - `listDocumentTargets(doc)` — every linkable item in a document (OpenAPI endpoints, AsyncAPI operations)
  - `documentToMarkdown(doc, target?)` — Markdown for one target, or the whole document
  - `documentToLlmsTxt(doc, options?)` — an `llms.txt` index linking each target

  All three dispatch on the document's own version key, so the same build step handles AsyncAPI and OpenAPI unchanged, and a future spec is one adapter with no signature changes. The spec-specific serializers (`asyncApiToMarkdown`, `openApiToMarkdown`, `asyncApiOperationToMarkdown`, `openApiEndpointToMarkdown`) are exported too, and their `deref` argument is now optional, defaulting to resolving `$ref` pointers against the document itself.

  Use the DOM-free `apiuikit/markdown` entry from Node build scripts, server routes, and edge workers. The helpers remain available from the root entry for browser-side use.

  See [Markdown export](https://apiuikit.com/docs/usage/markdown-export.md) for the full flow.

## 1.1.0

### Minor Changes

- 75f3f1e: Wrap the OpenAPI render tree in an error boundary, matching AsyncAPI. `OpenAPI` and `OpenAPIRenderer` now accept `errorFallback` and `onError`, so a render-time throw from a malformed document is contained by the library instead of escaping into the host application. `AsyncAPIRenderer` now forwards both props too, which previously left the raw-string path stuck with the default fallback.

  The "Example Request" panel now defaults to the agent prompt target rather than cURL.

## 1.0.1

### Patch Changes

- 5454e21: fix for post v1 patches

## 1.0.0

### Major Changes

- 8da2291: apiuikit support for asyncapi/openapi document

## 0.5.0

### Minor Changes

- aaa04ed: add support for extension catalog

## 0.4.1

### Patch Changes

- 4be20f1: docs update

## 0.4.0

### Minor Changes

- e02cf61: Improve search panel UI with clearer Cmd/Ctrl+K shortcut hints for Mac and non-Mac users

## 0.3.0

### Minor Changes

- 58c3b5f: Added a search component and make the components like Operations, Servers, Messages an independent exported component

## 0.2.1

### Patch Changes

- 51fd232: better colour consistency and better dark mode

## 0.2.0

### Minor Changes

- eb12f5c: refactor local dereferencing($ref)

## 0.1.1

### Patch Changes

- fa0cfce: project readme update
