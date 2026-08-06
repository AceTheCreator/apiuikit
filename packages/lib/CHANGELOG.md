# apiuikit

## 1.2.0

### Minor Changes

- 0ea5049: Add `config.markdown.url`, pointing "View as Markdown" at a real hosted URL instead of a throwaway `blob:` URL, which is revoked on reload, can't be shared, and is invisible to crawlers and AI agents. Accepts a string, or a resolver that receives the target and can return `null` to keep the blob fallback for documents you don't serve.

  Add spec-agnostic helpers for publishing an AI-discoverable docs site, so a site built with apiuikit can be read by agents and crawlers rather than only in a browser:

  - `listDocumentTargets(doc)` — every linkable item in a document (OpenAPI endpoints, AsyncAPI operations)
  - `documentToMarkdown(doc, target?)` — Markdown for one target, or the whole document
  - `documentToLlmsTxt(doc, options?)` — an `llms.txt` index linking each target

  All three dispatch on the document's own version key, so the same build step handles AsyncAPI and OpenAPI unchanged, and a future spec is one adapter with no signature changes. The spec-specific serializers (`asyncApiToMarkdown`, `openApiToMarkdown`, `asyncApiOperationToMarkdown`, `openApiEndpointToMarkdown`) are exported too, and their `deref` argument is now optional, defaulting to resolving `$ref` pointers against the document itself.

  Use the DOM-free `apiuikit/markdown` entry from Node build scripts, server routes, and edge workers. The helpers remain available from the root entry for browser-side use.

  See [Markdown export](https://apiuikit.com/docs/usage/markdown-export.md) for the full flow.

## 1.1.0

### Minor Changes

- 75f3f1e: Wrap the OpenAPI render tree in an error boundary, matching AsyncAPI. `OpenAPI` and `OpenAPIRenderer` now accept `errorFallback` and `onError`, so a render-time throw from a malformed document is contained by the library instead of escaping into the host application. `AsyncAPIRenderer` now forwards both props too, which previously left the raw-string path stuck with the default fallback.

  The "Example Request" panel now defaults to the agent prompt target rather than cURL.

## 1.0.1

### Patch Changes

- 5454e21: fix for post v1 patches

## 1.0.0

### Major Changes

- 8da2291: apiuikit support for asyncapi/openapi document

## 0.5.0

### Minor Changes

- aaa04ed: add support for extension catalog

## 0.4.1

### Patch Changes

- 4be20f1: docs update

## 0.4.0

### Minor Changes

- e02cf61: Improve search panel UI with clearer Cmd/Ctrl+K shortcut hints for Mac and non-Mac users

## 0.3.0

### Minor Changes

- 58c3b5f: Added a search component and make the components like Operations, Servers, Messages an independent exported component

## 0.2.1

### Patch Changes

- 51fd232: better colour consistency and better dark mode

## 0.2.0

### Minor Changes

- eb12f5c: refactor local dereferencing($ref)

## 0.1.1

### Patch Changes

- fa0cfce: project readme update
