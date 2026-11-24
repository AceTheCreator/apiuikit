// Typechecks scripts/fixtures/nodenext against the built dist/*.d.ts with
// `moduleResolution: nodenext`, so declarations that only resolve under
// bundler resolution fail the build instead of shipping as `any`.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const tsc = require.resolve('typescript/bin/tsc')
const project = fileURLToPath(new URL('./fixtures/nodenext/tsconfig.json', import.meta.url))

try {
  execFileSync(process.execPath, [tsc, '-p', project], { stdio: 'pipe' })
} catch (err) {
  console.error(err.stdout?.toString() ?? '')
  console.error(err.stderr?.toString() ?? '')
  throw new Error('[apiuikit] nodenext type check of dist declarations failed (see above).')
}

console.log('[apiuikit] dist declarations typecheck under moduleResolution nodenext.')
