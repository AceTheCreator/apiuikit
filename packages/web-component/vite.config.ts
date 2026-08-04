import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

// Bundles React, ReactDOM, and apiuikit (with @asyncapi/parser) directly —
// nothing is externalized — so the output works standalone from a plain
// <script> tag with no consumer-side install step. inlineDynamicImports is
// required for the iife output (Rollup can't emit lazy chunks in iife
// format); applied to both formats for one consistent, self-contained bundle
// rather than branching behavior per format.
export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.json' }),
  ],
  // React/ReactDOM reference process.env.NODE_ENV internally. The browser
  // has no `process` global to resolve it, so it's hardcoded at build time.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      name: 'ApiUIKitWebComponent',
      formats: ['es', 'iife'],
      fileName: (format) => `web-component.${format === 'es' ? 'es' : 'iife'}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) =>
          assetInfo.names?.[0]?.endsWith('.css') ? 'web-component.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
