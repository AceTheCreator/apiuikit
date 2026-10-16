# @apiuikit/web-component

## 2.4.0

### Minor Changes

- 80de5e6: AsyncAPI operations: when an operation has a `title`, it now replaces the channel address instead of sitting above it. This applies to the Operations table rows and to the operation's side panel (and inline operation card) header. The address is still shown on hover. Operations without a title render as before.

### Patch Changes

- 80de5e6: Bump the built-in `@apiuikit/ws-try-it-plugin` to `^0.2.0`. WebSocket Try it tabs now show an operation's `title` instead of its channel address when it has one.
- Updated dependencies [80de5e6]
- Updated dependencies [80de5e6]
  - apiuikit@2.4.0

## 2.3.1

### Patch Changes

- 0d67165: Keep large, densely linked specs responsive by indexing and exporting each component schema once instead of re-expanding it at every reference.

  Fixed:

  - Large, densely linked specs no longer freeze the page while the search index builds. Each component schema re-indexed every schema it could reach through a `$ref`, and vendor extensions holding inlined schemas (Stripe's `x-expansionResources`) were flattened into each entry's search text. Stripe's spec produced 271k entries (some 1MB of text each) and took over a minute; it now produces 12.8k and builds in under 150ms. A reference to another component schema is still listed where it occurs, but its fields are found under that schema's own entry, and a schema's search text now covers only its own scalar keywords and scalar lists (description, type, enum, …).
  - Opening an operation in a large, densely linked spec no longer hangs the page. The default "Agent Prompt" code sample, and the "Copy for LLM" export, inlined every referenced schema at every place it was reached; on Stripe's spec one endpoint came to millions of nodes and never finished. Exported Markdown now refers to another component schema as `{ "$ref": "#/components/schemas/<name>" }` and renders each one once: the full-document exports already list every schema under "Schemas", and the single-endpoint and single-operation exports (`openApiEndpointToMarkdown`, `asyncApiOperationToMarkdown`) end with a new "Referenced Schemas" section. A body that is itself a component schema is still expanded at its own level. On Stripe, one endpoint's prompt now builds in under 20ms and the full export in under 150ms.

- Updated dependencies [0d67165]
  - apiuikit@2.3.1

## 2.3.0

### Minor Changes

- 7fed283: Render usable OpenAPI and AsyncAPI content despite validation errors, with a shorter quick-nav rail and consistent section spacing on narrow layouts.

  Changed:

  - OpenAPI and AsyncAPI parser entry points now retain usable documents when validation reports errors. Diagnostics continue through `onDiagnostics` or the imperative helper's returned `diagnostics`, so consumers control their presentation without a built-in validation panel. Unreadable input, unsupported documents, or failures that prevent a usable document from being produced still return no view.
  - OpenAPI preserves the decoded document when reference resolution fails and reports the errors. AsyncAPI continues applying operation traits, resolving references, and converting Avro and Protobuf schemas when validation errors are allowed.
  - Render errors in content sections are contained so other sections remain accessible; OpenAPI operation details also have their own fallback. Error boundaries retry when the document or selected content changes. The exported `ErrorBoundary` accepts an optional `resetKey` to support this recovery in consumer integrations.
  - The desktop quick-nav rail is capped at 240px tall (and still never more than 70% of the viewport). It used to scale with the viewport, so a long document on a tall screen grew it to over a hundred ticks — about 700px of rail that read more like a scrollbar than a table of contents. It now tops out at roughly two dozen item ticks; past that, each tick stands for a run of items, the active one still highlights, and larger sections still get more ticks than smaller ones.
  - The rail now sits 12px from the widget's left edge, Notion-style, instead of against the content column. On an ultra-wide screen it stays out by the frame rather than beside the content. The point where it hands over to the floating button is unchanged: the rail still needs 48px of clearance from the content column.

  Fixed:

  - Missing OpenAPI metadata and malformed parameter lists no longer automatically blank otherwise usable documentation. A missing or non-string `info.version` is reported rather than silently accepted through the parser's default value.
  - Below the `@lg` breakpoint, the gap between the Servers section and the content tabs was 88px against 48px on large screens, from a mobile-only top margin on the tab bar. It is now 48px at every width.
  - A section with no side content still rendered its empty side column on narrow layouts, where the section's `gap-6` gave it 24px of space. That padded the space under the content tabs (56px against 32px on large screens, above the endpoints list and its "Expand all" toggle) and under every other section without side content. The empty column is now hidden below `@lg`; from `@lg` up it still reserves the right gutter.
  - OpenAPI diagnostics no longer repeat one defect at every ancestor. The generic "must have required property '$ref'" and "must match exactly one schema in oneOf" messages are dropped wherever a more specific error covers the same node, exact duplicates are removed, and `path` is now split into segments (`["paths", "/pets/{id}", "get"]`) instead of a single JSON-pointer string.

### Patch Changes

- Updated dependencies [7fed283]
  - apiuikit@2.3.0

## 2.2.0

### Minor Changes

- cf88cc1: AsyncAPI Operations table: when an operation has a `title`, show it as the row's primary label with the channel address beneath in smaller text. Operations without a title render as before.

### Patch Changes

- Updated dependencies [cf88cc1]
  - apiuikit@2.2.0

## 2.1.0

### Minor Changes

- 662cff0: Add single-item elements that embed one item inline, mirroring the React single-item sections: `<apiuikit-openapi-endpoint>` (by `operation-id`, or `method` + `path`), `<apiuikit-openapi-webhook>` (by `name`, optional `method`), `<apiuikit-asyncapi-operation>` (by `operation-id`), `<apiuikit-asyncapi-message>` (by `message-id`), and the spec-agnostic `<apiuikit-schema>` (by `name`). Each is also available as its own subpath import (e.g. `@apiuikit/web-component/openapi-endpoint`). The endpoint and webhook elements accept an `onNavigate` property for following response links to other operations.

## 2.0.1

### Patch Changes

- 29a34bf: Add npm keywords so the packages are discoverable in npm search.
- Updated dependencies [29a34bf]
  - apiuikit@2.0.1

## 2.0.0

### Major Changes

- 5e5f909: v2: white background by default, themes that merge, and a quick nav that stays put

  Breaking:

  - The default light `background` is now white (`#ffffff`), not `#f8fafc`. Rendered full-page on a white page, the old grey read as a box ending wherever the content did. Hosts on a non-white page should set `theme.light.background` to their page's color — the sticky navbar, content tabs and side panels paint it too.
  - A `theme` you pass is now layered over the defaults per key and per shade, instead of replacing them wholesale. Anyone who passed a config without `theme.colors.primary` was getting the stylesheet's orange fallback and will now get the documented blue accent. The light/dark decision still reads your own theme, so "only `dark` given" still renders dark.
  - The desktop quick-nav rail hands over to the floating button whenever the gutter beside the content can't fit it, rather than at a fixed 1024px. Tablet and small-laptop widths (roughly 1024–1380px) previously kept the rail, where it overlapped the text; they now get the floating button.

  Fixed:

  - The document toolbar stuck 10px below its own painted background, so the document scrolled visibly through that strip on the way back up. It now sticks flush, with its breathing room as padding inside the bar.
  - The layouts reserved 72px above the toolbar, left from when it was `position: fixed`. As a sticky element it takes its own space, so that was dead space at the top of every document.
  - `.apiuikit-root` now fills a container that has a definite height, so a short document in a full-height pane no longer leaves its background — and a side panel using `sidePanel.containment: "component"` — stopping halfway down the pane.
  - The quick nav's floating button is pinned by a `position: sticky; bottom: 0` anchor, which only holds while the anchor sits below the fold. Rendered mid-document, the button scrolled off screen once the reader passed it; the nav is now last in the layout.
  - The desktop rail is placed against the content column rather than the widget's left edge, so on an ultra-wide screen it stays beside the content instead of drifting to the window edge, 48px clear of it.

### Patch Changes

- Updated dependencies [5e5f909]
  - apiuikit@2.0.0

## 1.7.0

### Minor Changes

- 3b10fea: Rebuild against the latest `apiuikit` to pick up changes that had shipped in the library but not yet in the bundled web components: `config.theme.mode` (`"light" | "dark" | "system"`) now works on all elements, and the document toolbar / compact sidebar toggle no longer detach from a bounded, independently-scrolling host pane.

## 1.6.0

### Minor Changes

- dc9c8d1: Minor ui fixes

### Patch Changes

- Updated dependencies [2a4e80f]
  - apiuikit@1.7.0

## 1.5.0

### Minor Changes

- 30e0cf3: Add standalone, modular custom elements. Full-document elements (`<apiuikit-asyncapi>`, `<apiuikit-asyncapi-renderer>`, `<apiuikit-openapi>`, `<apiuikit-openapi-renderer>`) and nine new per-section elements — `<apiuikit-asyncapi-servers>`, `-operations`, `-messages`, `-info`, the OpenAPI equivalents `<apiuikit-openapi-servers>`, `-endpoints`, `-webhooks`, `-info`, and a single `<apiuikit-schemas>` shared by both spec types (`components.schemas` is the same shape on both) — each register independently via a matching subpath import (e.g. `@apiuikit/web-component/asyncapi-operations`), so consumers only register the element(s) they actually use. The default `@apiuikit/web-component` entry still registers everything, for backward compatibility.

## 1.4.0

### Minor Changes

- Rename custom element tags from `aui-*` to `apiuikit-*` (`<apiuikit-asyncapi>`, `<apiuikit-asyncapi-renderer>`, `<apiuikit-openapi>`, `<apiuikit-openapi-renderer>`). Update any markup that used the old `aui-*` tag names.

## 1.3.0

### Minor Changes

- Integrate `asyncsnippet` for AsyncAPI operation code samples (multi-language clients filtered by protocol), and replace the OpenAPI "Copy Markdown" control with an Agent Prompt sample via the existing `agent:prompt` entry backed by `openApiEndpointToMarkdown`.

### Patch Changes

- Updated dependencies
  - apiuikit@1.5.0

## 1.2.0

### Minor Changes

- 4e755c6: Add a per-section `layout` prop (`"columns"` | `"stacked"`) on modular AsyncAPI and OpenAPI section components. Default `"columns"` keeps the reserved right gutter; `"stacked"` uses the full container width (no prose max-width), drops empty side space, and stacks Info/Servers side content below the main content.
- 4e755c6: Add `config.sidePanel.containment` (`"component"` | `"viewport"`) so SidePanel overlays can either clip to the widget's root element or cover the full browser viewport. The default remains `"viewport"` for backward compatibility; use `"component"` for contained embeds and section components.

### Patch Changes

- 4e755c6: Fix a hairline visible at the closed SidePanel's edge: `shadow-xl`'s blurred box-shadow was bleeding past the portal overlay's `overflow: hidden` clip even while the panel was translated off-screen. The shadow is now only applied while the panel is open.
- Updated dependencies [4e755c6]
- Updated dependencies [4e755c6]
- Updated dependencies [4e755c6]
  - apiuikit@1.4.0

## 1.1.0

### Minor Changes

- 463d671: Fix SidePanel not sliding fully off-screen when closed

### Patch Changes

- Updated dependencies [463d671]
  - apiuikit@1.3.0

## 1.0.0

### Major Changes

- 8da2291: apiuikit support for asyncapi/openapi document

### Patch Changes

- Updated dependencies [8da2291]
  - apiuikit@1.0.0
