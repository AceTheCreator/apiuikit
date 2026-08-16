import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Independent plugin-SDK build, mirroring vite.markdown.config.ts: kept out
 * of the UI's Rollup graph so consumers who never register a plugin don't
 * pull this surface into their bundle, while plugin authors get a small,
 * typed entry point.
 */
export default defineConfig({
  publicDir: false,
  plugins: [react()],
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
