---
"apiuikit": patch
"@apiuikit/web-component": patch
---

Keep large, densely linked specs responsive by indexing and exporting each component schema once instead of re-expanding it at every reference.

Fixed:
- Large, densely linked specs no longer freeze the page while the search index builds. Each component schema re-indexed every schema it could reach through a `$ref`, and vendor extensions holding inlined schemas (Stripe's `x-expansionResources`) were flattened into each entry's search text. Stripe's spec produced 271k entries (some 1MB of text each) and took over a minute; it now produces 12.8k and builds in under 150ms. A reference to another component schema is still listed where it occurs, but its fields are found under that schema's own entry, and a schema's search text now covers only its own scalar keywords and scalar lists (description, type, enum, …).
- Opening an operation in a large, densely linked spec no longer hangs the page. The default "Agent Prompt" code sample, and the "Copy for LLM" export, inlined every referenced schema at every place it was reached; on Stripe's spec one endpoint came to millions of nodes and never finished. Exported Markdown now refers to another component schema as `{ "$ref": "#/components/schemas/<name>" }` and renders each one once: the full-document exports already list every schema under "Schemas", and the single-endpoint and single-operation exports (`openApiEndpointToMarkdown`, `asyncApiOperationToMarkdown`) end with a new "Referenced Schemas" section. A body that is itself a component schema is still expanded at its own level. On Stripe, one endpoint's prompt now builds in under 20ms and the full export in under 150ms.
