---
"apiuikit": minor
---

Merge `AsyncAPISchemas` and `OpenAPISchemas` into a single spec-agnostic `Schemas` section. `components.schemas` has the identical shape in both document types and the section reads nothing else off the document, so the two variants only differed in which provider they set up and in a spec-mismatch warning that had nothing to warn about. `Schemas` accepts either document standalone (picking a provider from the document's own version key) and renders under an ambient provider of either spec type. The old names remain exported as deprecated aliases.
