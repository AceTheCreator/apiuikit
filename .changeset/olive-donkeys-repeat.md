---
"apiuikit": minor
---

Wrap the OpenAPI render tree in an error boundary, matching AsyncAPI. `OpenAPI` and `OpenAPIRenderer` now accept `errorFallback` and `onError`, so a render-time throw from a malformed document is contained by the library instead of escaping into the host application. `AsyncAPIRenderer` now forwards both props too, which previously left the raw-string path stuck with the default fallback.

The "Example Request" panel now defaults to the agent prompt target rather than cURL.
