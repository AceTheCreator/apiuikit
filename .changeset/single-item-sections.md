---
"apiuikit": minor
---

Add single-item sections that render one item inline instead of a whole list: `OpenAPIEndpoint` (by `operationId` or `method` + `path`), `OpenAPIWebhook`, `AsyncAPIOperation`, `AsyncAPIMessage`, and the spec-agnostic `Schema`. They work standalone with a `document` prop or composed under `OpenAPIProvider` / `AsyncAPIProvider`, default to the full-width `"stacked"` layout, and render nothing (with a console warning) when the item isn't found.
