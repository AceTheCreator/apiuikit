import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const isWatch = process.argv.includes('--watch')

// Touched after every completed (re)build. The playground dev server reloads
// off this marker instead of dist/, which is emptied mid-rebuild — see
// packages/playground/DEVELOPMENT.md.
function buildCompleteMarker(): Plugin {
  const marker = fileURLToPath(new URL('./.build-complete', import.meta.url))
  return {
    name: 'build-complete-marker',
    closeBundle() {
      writeFileSync(marker, String(Date.now()))
    },
  }
}

export default defineConfig({
  // Library builds shouldn't ship the Vite demo's public/ assets (e.g. vite.svg).
  publicDir: false,
  plugins: [
    react(),
    // .d.ts generation is slow and unnecessary for the playground watch loop;
    // one-shot `vite build` / publish still emits types.
    ...(isWatch ? [] : [dts({ include: ['src'], tsconfigPath: './tsconfig.app.json' })]),
    buildCompleteMarker(),
  ],
  build: {
    // Watch rebuilds must not wipe dist/ before writing. A failed incremental
    // rebuild (known Vite 6 / Rollup commonjs race) would otherwise leave
    // playground permanently broken until the next successful build.
    emptyOutDir: !isWatch,
    // Work around Vite 6 watch rebuild crashes:
    // "[commonjs] Cannot read properties of undefined (reading 'resolved')"
    // See https://github.com/vitejs/vite/issues/19410
    commonjsOptions: {
      strictRequires: 'auto',
    },
    lib: {
      entry: 'src/index.ts',
      name: 'apiuikit',
      formats: ['es', 'cjs'],
      fileName: (format) => `apiuikit.${format}.js`,
    },
    rollupOptions: {
      maxParallelFileOps: 100,
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        // Pinned so the filename matches package.json's exports["./style.css"]
        // regardless of the package name — Vite otherwise derives the CSS
        // asset name from package.json.name, which silently breaks that path
        // on a rename.
        assetFileNames: (assetInfo) =>
          assetInfo.names?.[0]?.endsWith('.css') ? 'apiuikit.css' : 'assets/[name]-[hash][extname]',
      },
    },
    watch: isWatch
      ? {
          chokidar: {
            // Marker lives outside dist/; writing it must not kick off another rebuild.
            // With emptyOutDir:false, dist/ is no longer auto-ignored — ignore it explicitly.
            ignored: ['**/.build-complete', '**/dist/**'],
          },
        }
      : undefined,
  },
})
