---
"apiuikit": minor
---

Add `openapi.document.topbar`/`asyncapi.document.topbar` plugin slots, rendered once per document in the top bar's controls area alongside the built-in search and markdown-export controls. Existing operation-scoped slots (`*.operation.tab`, `*.operation.reference.supplementary`) are unaffected — this is a new, document-level extension point for plugins that aren't tied to a single operation.
