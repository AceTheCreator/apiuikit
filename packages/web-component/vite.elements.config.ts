import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

// Per-element entry points, built as a second pass alongside vite.config.ts.
// web-component.es.js / .iife.js (from vite.config.ts) stay the all-in-one
// convenience bundle for CDN/no-bundler use; these ES-only entries are for
// bundler consumers who want just the element(s) they actually use, so they
// don't pay for e.g. the AsyncAPI parser when only rendering OpenAPI.
// ES-only (no iife) because these are meant for bundler consumers, and
// Rollup's iife/umd formats can't emit multiple entry points from one build.
export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.json' }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    // The first build (vite.config.ts) already ran and populated dist/;
    // don't wipe it out from under that output.
    emptyOutDir: false,
    lib: {
      entry: {
        asyncapi: 'src/elements/asyncapi.tsx',
        'asyncapi-renderer': 'src/elements/asyncapi-renderer.tsx',
        'asyncapi-servers': 'src/elements/asyncapi-servers.tsx',
        'asyncapi-operations': 'src/elements/asyncapi-operations.tsx',
        'asyncapi-messages': 'src/elements/asyncapi-messages.tsx',
        'asyncapi-info': 'src/elements/asyncapi-info.tsx',
        openapi: 'src/elements/openapi.tsx',
        'openapi-renderer': 'src/elements/openapi-renderer.tsx',
        'openapi-servers': 'src/elements/openapi-servers.tsx',
        'openapi-endpoints': 'src/elements/openapi-endpoints.tsx',
        'openapi-webhooks': 'src/elements/openapi-webhooks.tsx',
        'openapi-info': 'src/elements/openapi-info.tsx',
        schemas: 'src/elements/schemas.tsx',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `elements/${entryName}.js`,
    },
    rollupOptions: {
      output: {
        // Same CSS content as the main bundle (both pull in the same
        // "apiuikit/style.css") — write it under the same name so it lands
        // as one shared file rather than four duplicate CSS assets.
        assetFileNames: (assetInfo) =>
          assetInfo.names?.[0]?.endsWith('.css') ? 'web-component.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
