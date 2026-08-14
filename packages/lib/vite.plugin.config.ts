import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Independent plugin-SDK build, mirroring vite.markdown.config.ts: kept out
 * of the UI's Rollup graph so consumers who never register a plugin don't
 * pull this surface into their bundle, while plugin authors (and this
 * package's own official plugins, e.g. @apiuikit/plugin-try-it-out-http) get
 * a small, typed entry point.
 *
 * Unlike markdown.ts, this entry re-exports `buildHarRequest` from
 * `helpers/codeSamples.ts`, which imports `@readme/httpsnippet` — so it needs
 * the same Node-builtin polyfills as the main UI build (vite.config.ts).
 */
function browserNodePolyfills(): Plugin {
  const browserUtilInspect = fileURLToPath(new URL('./src/shims/utilInspect.ts', import.meta.url))
  return {
    name: 'apiuikit-plugin-browser-node-polyfills',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './util.inspect' && importer?.includes('/object-inspect/index.js')) {
        return browserUtilInspect
      }
    },
  }
}

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      url: 'url',
    },
  },
  plugins: [browserNodePolyfills(), react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/plugin.ts',
      name: 'apiuikitPlugin',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'plugin.cjs' : 'plugin.es.js'),
    },
    rollupOptions: {
      maxParallelFileOps: 100,
      // Without this, react/react-dom get bundled into plugin.es.js as their
      // own private copy instead of sharing the consuming app's single React
      // instance — useContext then reads off a React that was never actually
      // initialized by the host app, and blows up at runtime with "Cannot
      // read properties of null (reading 'useContext')". Must match
      // vite.config.ts's externals exactly for the same reason it does.
      //
      // 'apiuikit' itself is external too: plugin.ts re-exports
      // PluginSlot/usePluginSlot/useDocumentContext from the built apiuikit
      // package (self-reference) rather than bundling `./contexts` fresh —
      // otherwise this build's DocumentContext and the main build's
      // DocumentContext would be two different objects, and context lookups
      // would fail even when correctly nested under a provider.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'apiuikit'],
      output: {
        chunkFileNames: 'plugin-assets/[name]-[hash].js',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
