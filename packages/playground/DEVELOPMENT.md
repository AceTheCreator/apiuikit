# Playground development

Local app for trying `apiuikit` the way a real consumer would: it imports the
**built** package from `packages/lib/dist/`, not the TypeScript source.

For the one-liner to start it, see the [root CONTRIBUTING.md](../../CONTRIBUTING.md#playground).

## Run it

From the repo root:

```bash
npm run playground
```

That will:

- **Watch rebuilds keep the previous `dist/`.** Lib `vite.config.ts` sets
  `emptyOutDir: false` when `--watch` is on, so a failed incremental rebuild
  (e.g. the Vite 6 `[commonjs] Cannot read properties of undefined` race)
  does not wipe a good bundle and leave the playground blank on refresh.
  One-shot `vite build` still empties `dist/` as usual. Watch mode also skips
  `vite-plugin-dts` (types still emit on publish/`build:lib`) and ignores
  `.build-complete` + `dist/` in chokidar so those writes cannot loop a rebuild.
- **One extra reload on startup.** The root `playground` script builds the lib
  once, then starts the watch build, whose first build also touches the
  marker. So the browser may reload once shortly after the dev server opens.
  Harmless.
- **Reload latency = library build time.** The browser intentionally waits for
  `[0] built in Xms` before reloading. If reloads feel like they stopped
  working, check the `[0]` process for a build error — no completed build, no
  marker touch, no reload. Playground-only edits (`packages/playground/src`)
  still use normal instant HMR and are unaffected by any of this.
- **Manually reloading the tab mid-build** can briefly serve a half-written
  bundle while files are being overwritten. Wait for `[0] built in …` (or the
  automatic reload) if the page looks wrong.
- **If you rename/move `packages/lib/dist` or the marker file**, update both
  vite configs together: the `ignored` glob and `libMarker` path in
  `packages/playground/vite.config.ts`, and the marker path in
  `packages/lib/vite.config.ts`. Nothing else ties them together.
- **`vitest`/`storybook` are unaffected**: the marker plugin only runs during
  `vite build`, and writing the marker outside watch mode (e.g. a one-off
  `npm run build:lib`) is harmless — the playground reloads once, with a
  complete `dist/`.

## Try it plugins

The preview shows a **Try it** button in the operation side panel's header, for
both spec types. The button comes from apiuikit itself, not from the playground.
`packages/lib` depends on one plugin per spec type:

| Spec | Package | What it does | Loaded from |
| --- | --- | --- | --- |
| OpenAPI | [`@apiuikit/openapi-try-it-plugin`](https://github.com/apiuikit/openapi-try-it-plugin) | Request builder that sends real HTTP requests from the browser | `containers/Path/Paths.tsx` |
| AsyncAPI | [`@apiuikit/ws-try-it-plugin`](https://www.npmjs.com/package/@apiuikit/ws-try-it-plugin) | WebSocket client for operations with a `ws`/`wss` server | `containers/Operation/Operations.tsx` |

Both are wired the same way:

- **Gated on `config.show.tryIt`.** This defaults to `false` because the panels
  send real traffic and can collect credentials. `Playground.tsx` turns it on in
  its `DEFAULT_CONFIG`, so it also shows up in the editable config pane and you
  can toggle it live.
- **Lazy-loaded.** Each plugin is a `lazy()` import, and the flag is checked
  before the element is created. While `tryIt` is off, the chunk is never
  fetched.
- **External in the lib build.** `/^@apiuikit\//` is in `external` in
  `packages/lib/vite.config.ts`, so the plugins resolve from the consumer's
  `node_modules` and share the same `DocumentContext` instance.
- **Wrapped in `PluginBoundary`** (`built-in:openapi.operation.tryIt` /
  `built-in:asyncapi.operation.tryIt`), so if a plugin crashes, only the button
  is lost, not the whole panel.

The WebSocket button renders nothing for an operation with no `ws`/`wss` server.
To see it, load an AsyncAPI document that declares one, e.g. the Gemini
websocket example in `src/data/suggestedSchemas.ts`. The bundled Kraken example
(`src/examples/example2.json`) has no `servers`, so it shows no button.

The playground has no direct dependency on either plugin. To try a local
plugin change, `npm link` it into `packages/lib` (or bump the version there),
not into the playground.

## Editing

| You change… | What happens |
| --- | --- |
| `packages/playground/src/**` | Instant HMR, like a normal Vite app |
| `packages/lib/src/**` | Library rebuilds (~3–6s), then the browser full-reloads automatically |

Wait for `[0] built in …` in the terminal if the page looks wrong after a lib edit. Reloading mid-build can briefly hit a half-written `dist/`.

On first start you may see one extra reload — the watch build finishes after the initial build. Harmless.

## Troubleshooting

**Page blank / `Failed to load url …apiuikit.es.js`**
- Check `[0]` for a library build error. No successful build → no reload → stale or missing files in `dist/`.
- Fix the error, wait for `[0] built in …`, then the page should recover on its own.

**Lib edits don't show up**
- Confirm `[0]` is still running and printing rebuilds when you save.
- Playground-only changes should still HMR; if those also fail, restart `npm run playground`.

**Manual refresh during a rebuild looks broken**
- Expected. Prefer the automatic reload (or wait for `[0] built in …`).

## Why this setup exists (optional)

The playground must exercise the same `dist/` artifact that gets published to npm.
A library rebuild is not atomic: watching `dist/` directly can reload while files
are still being written (or after a failed rebuild wiped them), which blanks the page.

So:

- Watch mode keeps the previous `dist/` on failure (`emptyOutDir: false` in the lib config).
- The playground ignores `packages/lib/dist/**` for Vite's file watcher.
- When a rebuild finishes, the lib build touches `packages/lib/.build-complete`.
- The playground watches that marker and does one full reload only then.

```
save packages/lib/src/**
  → [0] rebuilds dist/ (~3–6s)
  → touches .build-complete
  → [1] invalidates modules + full-reload
  → browser loads a complete bundle
```

Relevant code:

- Marker: `buildCompleteMarker` in `packages/lib/vite.config.ts` (`writeBundle`)
- Reload: `libRebuildReload` in `packages/playground/vite.config.ts`

If you rename/move `dist/` or the marker, update **both** configs. The marker is
gitignored and never published. Storybook and Vitest are unaffected.
