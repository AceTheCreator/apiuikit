import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tests render this library from `src`, but the try-it package they
      // pull in resolves `apiuikit/plugin` to the *built* `dist` — a second
      // module graph, a second `DocumentContext`, and a built-in panel that
      // throws "must be used within a document provider" while correctly
      // nested. Point both specifiers at source so a test run has one of
      // each. Test-only: the published build keeps @apiuikit/* external, so
      // consumers resolve both to the single apiuikit their app loaded.
      //
      // Order matters — Rollup's alias plugin takes the first match, and a
      // bare `apiuikit` entry also matches `apiuikit/*`, so it comes second.
      'apiuikit/plugin': fileURLToPath(new URL('./src/plugin.ts', import.meta.url)),
      apiuikit: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    // The built-in try-it packages install from the registry, and Vitest
    // hands regular node_modules deps to Node's resolver, which doesn't see
    // the aliases above — so their `apiuikit/plugin` import would resolve to
    // this library's built `dist`: a second module graph, a second
    // `DocumentContext`, and a panel that throws "must be used within a
    // document provider" while correctly nested. Inlined, they go through
    // Vite and pick up the aliases. (Symlinked checkouts were inlined
    // already, which is why this only surfaced once the deps became real
    // packages.)
    server: { deps: { inline: [/@apiuikit\//] } },
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
