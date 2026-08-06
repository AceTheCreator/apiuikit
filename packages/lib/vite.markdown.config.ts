import { defineConfig } from 'vite'

/**
 * Independent publishing-helper build. Keeping this out of the UI's Rollup
 * graph prevents Node-oriented serializer dependencies from becoming shared
 * browser chunks while still shipping a DOM-free package subpath.
 */
export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/markdown.ts',
      name: 'apiuikitMarkdown',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'markdown.cjs' : 'markdown.es.js'),
    },
    rollupOptions: {
      maxParallelFileOps: 100,
      output: {
        chunkFileNames: 'markdown-assets/[name]-[hash].js',
      },
    },
  },
})
