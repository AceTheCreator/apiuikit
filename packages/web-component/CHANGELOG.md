# @apiuikit/web-component

## 1.6.0

### Minor Changes

- dc9c8d1: Minor ui fixes

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
