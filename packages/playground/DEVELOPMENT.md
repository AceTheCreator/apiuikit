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

1. Build `packages/lib` once
2. Start a library watcher (`[0]` in the terminal)
3. Start the playground Vite server (`[1]`)

Open the URL Vite prints (usually `http://localhost:5173`).

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
