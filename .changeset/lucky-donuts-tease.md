---
"apiuikit": minor
---

Add `config.markdown.url`, pointing "View as Markdown" at a real hosted URL instead of a throwaway `blob:` URL, which is revoked on reload, can't be shared, and is invisible to crawlers and AI agents. Accepts a string, or a resolver that receives the target and can return `null` to keep the blob fallback for documents you don't serve.

Add spec-agnostic helpers for publishing an AI-discoverable docs site, so a site built with apiuikit can be read by agents and crawlers rather than only in a browser:

- `listDocumentTargets(doc)` — every linkable item in a document (OpenAPI endpoints, AsyncAPI operations)
- `documentToMarkdown(doc, target?)` — Markdown for one target, or the whole document
- `documentToLlmsTxt(doc, options?)` — an `llms.txt` index linking each target

All three dispatch on the document's own version key, so the same build step handles AsyncAPI and OpenAPI unchanged, and a future spec is one adapter with no signature changes. The spec-specific serializers (`asyncApiToMarkdown`, `openApiToMarkdown`, `asyncApiOperationToMarkdown`, `openApiEndpointToMarkdown`) are exported too, and their `deref` argument is now optional, defaulting to resolving `$ref` pointers against the document itself.

Use the DOM-free `apiuikit/markdown` entry from Node build scripts, server routes, and edge workers. The helpers remain available from the root entry for browser-side use.

See [Markdown export](https://apiuikit.com/docs/usage/markdown-export.md) for the full flow.
