---
"apiuikit": minor
---

Add `initialLocation` and `onLocationChange` props to `<OpenAPI>`, `<AsyncAPI>`, and their parser counterparts `<OpenAPIRenderer>`/`<AsyncAPIRenderer>`, for deep linking. `initialLocation` seeds which nav tab and endpoint/webhook/operation/message/schema/server is selected on mount and scrolls it into view; `onLocationChange` fires whenever the selection changes (nav clicks, tab clicks, search-select), so a host app can keep a URL in sync. Both are additive and optional — existing usage is unaffected.
