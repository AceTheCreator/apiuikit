---
"apiuikit": minor
---

Add a plugin architecture so hosts can extend a rendered document from a separately-installed package: `plugins` on `OpenAPI` / `AsyncAPI` (and providers/sections), a dedicated `apiuikit/plugin` entry (`definePlugin`, slot types, document-context hooks), and operation tab/actions slots. Custom elements do not accept `plugins` yet.
