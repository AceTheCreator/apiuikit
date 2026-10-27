# Usage — Arazzo

## Overview

[Arazzo](https://spec.openapis.org/arazzo/latest.html) documents describe workflows: sequences of API calls where the outputs of one step feed the next. Each step calls an operation in an OpenAPI document listed under `sourceDescriptions`.

apiuikit renders each workflow as a list: its inputs, numbered steps, success criteria, success and failure actions, and outputs. Every step shows the real OpenAPI operation it calls, from its own source document, as a one-line header; clicking it opens the operation in the side panel, exactly as an endpoint opens on the OpenAPI page (Try it included). Parts of the page are also available as [section components](#sections), as [web components](#web-components), and as [Markdown](#markdown-export) for LLMs.

To see it without installing anything, open the [playground](https://playground.apiuikit.com) and pick **Pet coupons (Arazzo)** from the Examples menu.

Supported versions: Arazzo 1.0.0, 1.0.1 and 1.1.0. OpenAPI sources must be OpenAPI 3.0 or 3.1 (not Swagger 2.0).

### Coverage

Rendered today:

- `info` (including `x-logo`), and `sourceDescriptions` as a chip per source, marked when it couldn't be loaded
- `workflows`: summary, description, `dependsOn`, `inputs` (as a schema), `parameters`, `successActions`, `failureActions` and `outputs`
- `steps`: description, the target (`operationId`, `operationPath` or `workflowId`, including ones qualified with `$sourceDescriptions.<name>`), `parameters`, `requestBody` (payload and `replacements`), `successCriteria` (`simple`, `regex`, `jsonpath` and `xpath`), `onSuccess` and `onFailure` (`end`, `goto`, `retry` with `retryAfter` and `retryLimit`), and `outputs`
- The operation each step calls, embedded from its OpenAPI source
- Steps that call another workflow, local or in a `type: arazzo` source
- `components` (`inputs`, `parameters`, `successActions`, `failureActions`), shown in place wherever `$components.…` references them
- Runtime expressions, as [data flow](#data-flow) chips

Deliberate limits:

- **No graph view.** Workflows render as lists; a step's position is its number.
- **No execution.** Nothing is sent: the page documents a workflow, it doesn't run it. The Try it panel on an embedded operation sends that one request only, when you turn it on.
- **AsyncAPI sources** (Arazzo 1.1) aren't supported yet. They show as unavailable, and so do the steps that call into them.

## Install

```bash
npm install apiuikit
```

`Arazzo` takes a document you already have as an object and needs nothing else. To render YAML or JSON text, also install the Arazzo parser:

```bash
npm install @usearazzo/parser
```

Sources passed as text, and every source apiuikit fetches, need the OpenAPI parser too, as for [`OpenAPIRenderer`](./openapi.md#openapirenderer-component-with-parser):

```bash
npm install @scalar/openapi-parser
```

Both parsers are optional peers, loaded on demand. When one is missing, whatever needed it is left out with a diagnostic saying which package to install, and the rest still renders.

## `Arazzo` component (without parser)

Use this when you hold the Arazzo document and its sources as objects: imported from JSON files, or fetched and parsed by your own code.

```tsx
import { Arazzo } from "apiuikit";
import "apiuikit/style.css";
import flows from "./flows.arazzo.json";
import petstore from "./petstore.json";

export default function App() {
  return <Arazzo arazzo={flows} sources={{ petstore }} />;
}
```

### Props

| Prop      | Type                   | Required | Description                                          |
|-----------|------------------------|----------|-------------------------------------------------------|
| `arazzo` | `ArazzoDocumentData` | Yes | The parsed Arazzo document |
| `sources` | `Record<string, object \| string>` | No | Source documents, keyed by the source description's `name`. See [Supplying sources](#supplying-sources) |
| `baseUrl` | `string` | No | Where the Arazzo document lives. Relative source `url`s are resolved against it, and only then fetched |
| `loadSource` | `(url, sourceDescription) => document \| undefined` | No | Loads sources yourself, for example with auth headers. May return a promise |
| `maxDepth` | `number` | No | How deep `type: arazzo` sources may nest. Defaults to 3 |
| `config` | `ConfigInterface` | No | UI configuration. See [Config](#config) |
| `plugins` | `ApiuikitPlugin[]` | No | Plugins, applied to the embedded OpenAPI operations. See [Plugins](./plugins.md) |
| `onDiagnostics` | `(diagnostics) => void` | No | Called with every problem found while resolving. See [Diagnostics](#diagnostics) |
| `initialLocation` | `{ tab, key }` | No | The workflow or step to open first. See [Data flow](#data-flow) |
| `onLocationChange` | `(location) => void` | No | Called when the reader selects another workflow or step |
| `errorFallback` | `ReactNode \| (error, reset) => ReactNode` | No | Custom UI shown if rendering throws |
| `onError` | `(error, errorInfo) => void` | No | Called once when a render error is caught |

The component loads its page code on demand: an app that only shows OpenAPI or AsyncAPI pages doesn't download any of it. Like `OpenAPI`, it wraps its tree in an [error boundary](./openapi.md#error-handling).

## `ArazzoRenderer` component (with parser)

Use this for YAML or JSON text: entered by a user, or loaded at runtime. It needs `@usearazzo/parser` (see [Install](#install)).

```tsx
import { ArazzoRenderer } from "apiuikit";
import "apiuikit/style.css";

export default function App() {
  return (
    <ArazzoRenderer
      raw={arazzoYaml}
      sources={{ petstore: petstoreYaml }}
      onDiagnostics={(diagnostics) => console.log(diagnostics)}
    />
  );
}
```

It takes `raw: string` in place of `arazzo`, and every other prop of `Arazzo`.

### Diagnostics

A problem in one part of the document doesn't stop the rest from rendering. A source that can't be loaded and a step that can't be linked to its operation show an "Unavailable" badge with the reason; text that isn't an Arazzo document, or an unsupported version, renders nothing.

`onDiagnostics` receives every problem, in the shape OpenAPI and AsyncAPI use (`{ message, path, severity }`, `severity: 0` for errors), plus `source`: the name of the source description a diagnostic is about. Without `source`, `path` points into the Arazzo document. The library doesn't display diagnostics; your app decides how.

## Supplying sources

Sources are the one thing Arazzo adds that an OpenAPI page doesn't have: a workflow names its operations, and those live in other documents. Arazzo documents point at them by `url`, usually a relative file path. For each source description, apiuikit tries:

1. `sources[name]`: an object or raw text you pass, keyed by the source description's `name`.
2. Its `url`, through your `loadSource(url, sourceDescription)` if you give one, otherwise fetched. Absolute URLs are fetched as they are; relative ones only when you set `baseUrl`.
3. Otherwise the source is unresolved. Its chip and the steps that call into it say why, and the rest of the document still renders.

With the document and its sources on a server:

```tsx
<ArazzoRenderer raw={arazzoYaml} baseUrl="https://example.com/specs/flows.arazzo.yaml" />
```

With sources behind authentication:

```tsx
<ArazzoRenderer
  raw={arazzoYaml}
  baseUrl="https://example.com/specs/flows.arazzo.yaml"
  loadSource={async (url) => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return response.ok ? response.text() : undefined;
  }}
/>
```

Fetching needs the server to allow your page's origin (CORS). When it doesn't, pass the sources instead.

Sources of `type: arazzo` are resolved the same way, recursively, up to `maxDepth` levels deep. `sources` only applies to the entry document; nested documents load through `loadSource` or fetch, with relative URLs resolved against the nested document's own URL.

### In the playground

The [playground](https://playground.apiuikit.com) renders an Arazzo document when it's the entry file, and reads each source from the workspace file its `url` names: `./petstore.yaml` and `petstore.yaml` both find `petstore.yaml`, relative to the entry file's folder. An absolute `url` is fetched, unless a file named after its last path segment exists; "Save to workspace" creates that file. The **Sources** panel under the editor lists every source and where it came from, and offers to add, paste or fetch the ones that are missing. Fetching an Arazzo document by URL offers to fetch its relative sources too. The Examples menu has two official Arazzo examples, and one with its source left out.

## Data flow

Runtime expressions (`$inputs.petId`, `$steps.login.outputs.token`, `$response.body#/id`) show as chips, as written, everywhere they appear: parameter values, request bodies (in place, including inside strings like `"Bearer {$steps.login.outputs.token}"`), conditions, and outputs. A chip's tint says what it reads: a workflow input, a step or workflow output, or the step's own request or response. Its tooltip says the same in words.

- Clicking a chip that reads an input or an output goes to the workflow or step that defines it.
- Hovering or focusing it highlights the step that produces the value and every step that reads it.
- Each output lists the steps that use it ("Used by"), and so does each workflow input.
- A chip that points at nothing (a step, output, input, workflow, source or component that doesn't exist) is marked in red, with the reason on hover. The same problem is reported in `onDiagnostics`: as an error, or as a warning for an input the inputs schema doesn't declare.

Deep links select a workflow or a step: `initialLocation={{ tab: "workflows", key: "apply-coupon" }}` or `key: "apply-coupon/find-pet"` (workflow ID, `/`, step ID).

## Getting the model without rendering

```ts
import { parseArazzoDocument, resolveArazzoDocument } from "apiuikit";

// From YAML or JSON text. Needs @usearazzo/parser.
const result = await parseArazzoDocument(rawYaml, { sources: { petstore: petstoreYaml } });

// From an object you already parsed. No extra install needed.
const result2 = await resolveArazzoDocument(arazzoObject, { sources: { petstore: petstoreObject } });
```

Both take the [source options](#supplying-sources) (`sources`, `baseUrl`, `loadSource`, `maxDepth`) and return `{ status, diagnostics, document, model }`:

- `status` is `ready`, `partial` (something is wrong but the workflows still render: an invalid field, a source that couldn't be loaded, a step that couldn't be linked) or `unrenderable` (not an Arazzo document, or an unsupported version).
- `diagnostics` are the ones described under [Diagnostics](#diagnostics).
- `model` holds the sources (each `resolved` or `unresolved` with a `reason`) and the workflows. Each step's `target` is the linked operation (`method`, `path`, `operation`) or workflow, or `unlinked` with a reason. Each parsed runtime expression has a `target`: what it reads (`kind`, a `description`, and a `problem` when it points at nothing). `model.consumers` lists every place each value is read, keyed by the target's `valueKey`.

## Sections

To place parts of the page in your own layout, use the section components. Each takes the same source options as `Arazzo`, plus `config`, `plugins` and `layout`:

```tsx
import { ArazzoProvider, ArazzoInfo, ArazzoWorkflows, ArazzoWorkflowSection } from "apiuikit";

// One workflow on a page of its own.
<ArazzoWorkflowSection document={arazzoDocument} sources={{ petstore }} workflowId="apply-coupon" />

// Several sections, sharing one resolved document.
<ArazzoProvider document={arazzoDocument} sources={{ petstore }}>
  <ArazzoInfo />
  <MyIntro />
  <ArazzoWorkflows />
</ArazzoProvider>
```

`document` takes the parsed object, or YAML/JSON text (which needs `@usearazzo/parser`). Resolving loads the sources, so it's asynchronous: a section renders nothing until it's done. Under `ArazzoProvider` the document and its sources load once for every section inside. See [Composable sections](./sections.md#arazzo-sections).

## Web components

`<apiuikit-arazzo>`, `<apiuikit-arazzo-renderer>`, and the section elements `<apiuikit-arazzo-info>`, `<apiuikit-arazzo-workflows>` and `<apiuikit-arazzo-workflow>` take the document and its sources as properties, or as child `<script>` tags, so a static page needs no JavaScript:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@apiuikit/web-component/dist/elements/arazzo-renderer.js"></script>

<apiuikit-arazzo-renderer>
  <script type="application/yaml" data-arazzo>arazzo: 1.0.1 ...</script>
  <script type="application/yaml" data-source="petstore">openapi: 3.1.0 ...</script>
</apiuikit-arazzo-renderer>
```

They aren't in the all-in-one bundle; each loads from its own subpath. See [Web components](./with-webcomponents.md#arazzo-elements).

## Markdown export

The page's "Copy as Markdown" menu describes every workflow as steps: what each one calls (method and path), what it sends, when it succeeds, what happens next, and what it outputs. A step whose source couldn't be loaded is described by its reference as written.

To produce the same Markdown outside the page, resolve the document first, then pass the model to the [Markdown helpers](./markdown-export.md#arazzo). They take the model rather than the document, because describing a step needs its source loaded:

```ts
import { resolveArazzoDocument } from "apiuikit";
import { documentToMarkdown, documentToLlmsTxt, listDocumentTargets } from "apiuikit/markdown";

const { model } = await resolveArazzoDocument(arazzoDocument, { sources: { petstore } });
documentToMarkdown(model);                 // every workflow
listDocumentTargets(model);                // one target per workflow
documentToLlmsTxt(model, { baseUrl: "https://docs.example.com/workflows" });
```

`arazzoToMarkdown(model)` and `arazzoWorkflowToMarkdown(model, workflowId)` are exported too.

## Config

The page uses the same [`ConfigInterface`](../configuration/config.md). Of the `show` flags, it honours `info` (the info block and the source chips), `search`, `copyMarkdown` and `sidebar`. Flags for operations, such as `codeSamples` and `tryIt`, apply to the operations embedded in steps. Theme and `topOffset` work as on the other pages. There are no Arazzo-only options.

## When to use which entry

| Scenario | Use |
|---|---|
| Document and sources bundled at build time as JSON | `Arazzo` with `sources` |
| Document as YAML/JSON text, sources next to it on a server | `ArazzoRenderer` with `baseUrl` |
| Sources need auth headers, or come from your own store | `loadSource` |
| One workflow on a page of its own | `ArazzoWorkflowSection` |
| Plain HTML, Vue, Angular or Svelte | `<apiuikit-arazzo-renderer>` |
| The model or Markdown, without rendering | `resolveArazzoDocument` / `parseArazzoDocument` |
