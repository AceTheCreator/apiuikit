# Markdown Export

Everything here serves one goal: making a docs site built with apiuikit readable by AI agents and crawlers, not just by people in a browser.

## Overview

Every rendered document carries a floating **Copy as Markdown** button with two actions:

- **Copy for LLM**: writes the whole document, serialized as Markdown, to the clipboard.
- **View as Markdown**: opens that same Markdown in a new tab.

Hide the button entirely with `show: { copyMarkdown: false }`.

## Why "View as Markdown" may want a URL

By default, "View as Markdown" serializes in the browser and opens the result as a `blob:` URL. That works, but a blob URL is a dead end: it's revoked on reload, can't be shared with anyone, can't be bookmarked, and no crawler or AI agent can ever fetch it.

If you're publishing real documentation, you probably want the Markdown to live at a real URL, the way `docs.example.com/api.md` sits next to `docs.example.com/api`. The library can't create that URL itself, since it has no server and doesn't own your routes. What it can do is link to yours.

## `config.markdown.url`

```tsx
<OpenAPI openapi={doc} config={{ markdown: { url: "/docs/api.md" } }} />
```

With that set, "View as Markdown" opens `/docs/api.md` instead of generating a blob. Serialization is skipped entirely, so it also costs nothing on click.

| Value | What "View as Markdown" does |
|---|---|
| unset | Serializes in the browser and opens a `blob:` URL |
| a string | Opens that URL |
| a function returning a URL | Opens that URL |
| a function returning `null` | Falls back to the `blob:` URL |

The function form is for apps where only some documents have a hosted twin:

```tsx
const config: ConfigInterface = {
  markdown: {
    url: ({ kind, method, path }) =>
      kind === "operation" ? `/docs${path}/${method}.md` : "/docs/api.md",
  },
};
```

It receives a `MarkdownTarget`:

| Field | Type | Description |
|---|---|---|
| `kind` | `"document" \| "operation"` | `"document"` for the whole-page export. `"operation"` is reserved for per-endpoint exports, which don't offer a "view" action yet |
| `document` | `AsyncAPIDocumentData \| OpenAPIDocumentData` | The resolved document being rendered |
| `method` | `string?` | OpenAPI operations only, e.g. `"get"` |
| `path` | `string?` | OpenAPI operations only, e.g. `"/pets/{petId}"` |
| `id` | `string?` | AsyncAPI operations only, e.g. `"sendLightMeasurement"` |

Returning `null` rather than a guessed URL matters: a link to a 404 is worse than a blob.

## Producing the files to serve

Pointing at a URL only helps if something serves Markdown there. Three exported helpers cover it, and all three are spec-agnostic: they dispatch on the document's own version key, so the same code handles AsyncAPI and OpenAPI without you branching.

| Helper | Returns |
|---|---|
| `listDocumentTargets(doc)` | Every linkable item: OpenAPI endpoints, AsyncAPI operations |
| `documentToMarkdown(doc, target?)` | Markdown for one target, or the whole document when omitted |
| `documentToLlmsTxt(doc, options?)` | An `llms.txt` index linking each target |

A complete build step, in full:

```ts
import { listDocumentTargets, documentToMarkdown, documentToLlmsTxt, targetSlug } from "apiuikit/markdown";
import { mkdir, writeFile } from "node:fs/promises";
import doc from "./openapi.json" with { type: "json" };

const BASE = "https://docs.acme.com";
await mkdir("public/docs", { recursive: true });

// One Markdown file per endpoint/operation.
for (const entry of listDocumentTargets(doc)) {
  await writeFile(`public/docs/${targetSlug(entry.key)}.md`, documentToMarkdown(doc, entry.target));
}

// The whole document, plus the index pointing at every file above.
await writeFile("public/docs/api.md", documentToMarkdown(doc));
await writeFile("public/llms.txt", documentToLlmsTxt(doc, {
  baseUrl: `${BASE}/docs`,
  optional: [{ label: "OpenAPI spec", url: `${BASE}/openapi.yaml`, description: "the source document" }],
}));
```

Swap `openapi.json` for an AsyncAPI document and that script is unchanged.

These are plain functions with no DOM dependencies. Importing them from `apiuikit/markdown` keeps browser renderer code out of build scripts, server routes, and edge workers. They remain available from the root entry for browser-side use.

### `DocumentTarget`

Each entry from `listDocumentTargets` carries what you need to name a file, label a link, and serialize it:

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Stable id, unique in the document: `"get /pets"`, `"sendLightMeasurement"` |
| `label` | `string` | Human-readable, for a link or heading: `"GET /pets"` |
| `summary` | `string?` | The document's own one-line summary for the item, if it has one |
| `target` | `MarkdownTarget` | Pass to `documentToMarkdown`, and the same shape `config.markdown.url` receives |

That last field is the point of connection: the target you generated a file from is the target the resolver gets asked about, so the two can't drift.

### `documentToLlmsTxt` options

| Option | Type | Description |
|---|---|---|
| `baseUrl` | `string?` | Base for the default per-entry URL, `${baseUrl}/${targetSlug(key)}.md` |
| `url` | `(entry) => string \| null` | Your real route for an entry. Return `null` to leave it out of the index |
| `title` | `string?` | Overrides `info.title` |
| `summary` | `string?` | Overrides `info.description` |
| `optional` | `LlmsTxtLink[]?` | Trailing "Optional" links, e.g. the source spec |

The default URL is a guess at your routes, so pass `url` whenever they differ, which is most of the time.

Worth including the raw spec in `optional`, served at a stable path like `/openapi.yaml`. An agent can consume the source document directly rather than reading prose about it, and it costs you one copied file.

### Serving it

Markdown and `llms.txt` are usually served as `text/markdown` by default, which makes browsers download the file instead of displaying it. Overriding the content type to `text/plain` makes the links usable by a human too. On Netlify that's a `_headers` entry:

```
/llms.txt
  Content-Type: text/plain; charset=utf-8
  Access-Control-Allow-Origin: *
```

### Spec-specific serializers

If you already know which spec you have, `asyncApiToMarkdown` and `openApiToMarkdown` (plus `asyncApiOperationToMarkdown` and `openApiEndpointToMarkdown`) are exported too. Each takes an optional trailing `deref` for resolving `$ref` pointers, defaulting to resolving against the document itself.

### Adding a spec

`listDocumentTargets`, `documentToMarkdown`, and `documentToLlmsTxt` all dispatch through one adapter per spec in `src/helpers/specAdapters.ts`. Supporting a new spec means adding one adapter there: no signature changes, and callers get it for free.

## Worked example: the playground

apiuikit.com is the reference implementation. Its build step renders every bundled example to `/examples/<name>.md`, and the app hands the renderer a resolver that returns the matching path when the editor holds that example verbatim, and `null` once you've edited it or pasted your own document:

```tsx
markdown: {
  url: () => exampleMarkdownPath,   // a real path, or null
}
```

That's the whole pattern: real URL when a real file exists behind it, blob when it doesn't. See `packages/playground/scripts/generateDocsAssets.mjs` and `packages/playground/src/Playground.tsx`.
