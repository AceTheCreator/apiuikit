// vite-plugin-dts emits declarations with the specifiers exactly as written in
// src, which uses bundler resolution: extensionless relative paths, and
// `./index.ts` in plugin.ts. The package is `"type": "module"`, so under
// `moduleResolution: node16/nodenext` TypeScript reads dist/**/*.d.ts as ES
// module declarations and refuses those specifiers, turning every export into
// `any`. Rewrite each relative specifier to the explicit `.js` / `/index.js`
// path it resolves to in dist. Bundler resolution accepts both forms.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = fileURLToPath(new URL('../dist/', import.meta.url))

function* declarationFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* declarationFiles(path)
    else if (entry.name.endsWith('.d.ts')) yield path
  }
}

const isFile = (path) => existsSync(path) && statSync(path).isFile()

function resolveSpecifier(file, specifier) {
  const base = join(dirname(file), specifier.replace(/\.(ts|tsx|js|jsx)$/, ''))
  if (isFile(`${base}.d.ts`)) return specifier.replace(/(\.(ts|tsx|js|jsx))?$/, '.js')
  if (isFile(join(base, 'index.d.ts'))) return `${specifier.replace(/\/$/, '')}/index.js`
  return null
}

// `from '…'`, side-effect `import '…'`, and `import('…')` type references.
const specifierPattern = /(\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)(['"])(\.\.?\/[^'"]*|\.\.?)\2/gm

const unresolved = []
let rewritten = 0

for (const file of declarationFiles(distDir)) {
  const source = readFileSync(file, 'utf8')
  const output = source.replace(specifierPattern, (match, prefix, quote, specifier) => {
    const resolved = resolveSpecifier(file, specifier)
    if (resolved === null) {
      unresolved.push(`${relative(distDir, file)}: '${specifier}'`)
      return match
    }
    if (resolved !== specifier) rewritten += 1
    return `${prefix}${quote}${resolved}${quote}`
  })
  if (output !== source) writeFileSync(file, output)
}

if (unresolved.length > 0) {
  throw new Error(
    `[apiuikit] Could not resolve relative declaration import(s) in dist:\n  ${unresolved.join('\n  ')}`,
  )
}

console.log(`[apiuikit] Rewrote ${rewritten} relative declaration import(s) to explicit .js paths.`)
