import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const libMarker = fileURLToPath(new URL('../lib/.build-complete', import.meta.url))

// The lib watch build empties dist/ for a few seconds on every rebuild, so
// reloading off dist file events lands mid-build on missing files (blank
// screen). Reload only when the library signals a completed build via its
// marker file — see DEVELOPMENT.md.
function libRebuildReload(): Plugin {
  return {
    name: 'lib-rebuild-reload',
    apply: 'serve',
    configureServer(server) {
      fs.watchFile(libMarker, { interval: 200 }, (curr) => {
        if (curr.mtimeMs === 0) return // marker missing — no completed build yet
        server.moduleGraph.invalidateAll()
        server.ws.send({ type: 'full-reload' })
      })
      server.httpServer?.once('close', () => fs.unwatchFile(libMarker))
    },
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build: everything a consumer's own node_modules can provide stays
    // external — bundling the lib or CodeMirror would ship duplicate copies
    // (@codemirror/state breaks outright when duplicated). @asyncapi/parser is
    // only reached through the lib's dynamic import, so no parser code (and none of
    // its process.env references) lands in this bundle.
    return {
      plugins: [
        react(),
        dts({ include: ['src'], exclude: ['src/main.tsx', 'src/App.tsx'], tsconfigPath: './tsconfig.json' }),
      ],
      build: {
        // public/ holds the published docs surface (llms.txt, raw markdown) for
        // the app build only — it has no business in the library output.
        copyPublicDir: false,
        lib: {
          entry: 'src/index.ts',
          name: 'playground',
          formats: ['es', 'cjs'] as const,
          fileName: (format: string) => `playground.${format}.js`,
        },
        rollupOptions: {
          // The apiuikit package name must be matched with a regex: a plain string would not
          // externalize the 'apiuikit/style.css' subpath import.
          external: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            /^apiuikit(\/|$)/,
            /^@codemirror\//,
            /^@uiw\//,
            /^@asyncapi\//,
          ],
        },
      },
    }
  }

  // Dev server + standalone demo app build.
  return {
    plugins: [react(), libRebuildReload()],
    server: {
      watch: {
        // dist/ churns while the library rebuilds; the marker plugin above owns reloads.
        ignored: ['**/packages/lib/dist/**'],
      },
    },
    build: {
      // dist/ is reserved for the publishable library build (build:lib).
      outDir: 'dist-app',
    },
    define: {
      // The lib's dynamic @asyncapi/parser import gets bundled into the app build,
      // and the parser references process.env.
      'process.env': {},
    },
  }
})
