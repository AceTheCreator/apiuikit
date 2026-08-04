# Playground dev loop: how library rebuilds reach the browser

`npm run playground` (repo root) runs two processes with `concurrently`:

- `[0]` `vite build --watch` in `packages/lib` — rebuilds the library into `packages/lib/dist/` on every source change
- `[1]` `vite` dev server in `packages/playground` — serves the playground app

The playground imports `apiuikit` through the npm workspace symlink
(`node_modules/apiuikit -> packages/lib`), so Vite serves the **built files** in
`packages/lib/dist/` directly (you'll see them as `/@fs/...` URLs). That is
intentional: the playground exercises the same artifact that gets published to
npm, not the raw source.

## The race this setup has to avoid

A library rebuild is not atomic. Without safeguards, `vite build --watch` can
**empty `dist/`** (`emptyOutDir`) and then fail mid-rebuild — notably Vite 6's
`[commonjs] Cannot read properties of undefined (reading 'resolved')` on
incremental rebuilds — leaving `dist/` without `apiuikit.es.js` /
`apiuikit.css`. Refreshing the playground then keeps failing until a later
build succeeds.

Even when the rebuild succeeds, if the playground watched `dist/` directly the
first file written would trigger an HMR/full-reload **while sibling outputs
were still missing** — blank screen with `Failed to load url ...apiuikit.es.js`.

Watch mode therefore keeps the previous `dist/` (`emptyOutDir: false`) and
applies Rollup workarounds so incremental rebuilds complete; the playground
still only reloads off the completion marker (below), not off mid-write file
events.

## How it works now

Two small pieces, loosely coupled through one marker file, deterministic in
ordering:

1. **`packages/lib/vite.config.ts`** — the inline `buildCompleteMarker` plugin
   writes a timestamp to **`packages/lib/.build-complete`** in its
   `closeBundle` hook. In watch mode Vite closes the bundle after every rebuild
   (`BUNDLE_END`), and `closeBundle` runs only after **all** outputs (both the
   `es` and `cjs` files and their chunks) are fully written. So "the marker's
   mtime changed" is a reliable signal for "dist/ is complete again".

   The marker deliberately lives *outside* `dist/` — anything inside `dist/`
   is deleted by `emptyOutDir` at the *start* of the next rebuild, which would
   turn the marker itself into a mid-build signal. It is gitignored
   (`.build-complete` in the root `.gitignore`) and never published
   (`files: ["dist"]` in `packages/lib/package.json`).

2. **`packages/playground/vite.config.ts`** — two changes:
   - `server.watch.ignored: ['**/packages/lib/dist/**']` makes the dev server
     blind to `dist/` churn. No file event from a rebuild-in-progress can
     trigger a reload anymore.
   - The inline `libRebuildReload` plugin polls the marker with
     `fs.watchFile` (`fs.watchFile` is used instead of `fs.watch`/chokidar
     because it tolerates the file not existing yet on first startup and
     coalesces each touch into one event). When the marker's mtime changes it
     calls `server.moduleGraph.invalidateAll()` — required because the ignored
     dist files are no longer auto-invalidated by Vite — and sends one
     `full-reload` to the browser, which now finds a complete `dist/`.

The resulting flow on every library edit:

```
save packages/lib/src/**        (playground untouched, page keeps working)
  └─ [0] build started...       dist/ rewritten in place (~3–6s; previous files kept if rebuild fails)
       └─ closeBundle           .build-complete touched
            └─ [1] marker seen  invalidateAll + single full-reload
                 └─ browser     fresh, complete bundle
```

## Things to know / gotchas

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
