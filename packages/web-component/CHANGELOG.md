# @apiuikit/web-component

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
