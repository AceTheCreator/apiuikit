import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const packageRoot = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', packageRoot), 'utf8'))

async function verifyTarget(target, exportName, condition) {
  if (typeof target !== 'string' || !target.startsWith('./')) return

  const targetUrl = new URL(target.slice(2), packageRoot)
  try {
    await access(targetUrl)
  } catch {
    throw new Error(
      `[apiuikit] Package export check failed: ${exportName}.${condition} points to missing ${fileURLToPath(targetUrl)}`,
    )
  }
}

for (const [exportName, conditions] of Object.entries(packageJson.exports ?? {})) {
  if (typeof conditions === 'string') {
    await verifyTarget(conditions, exportName, 'default')
    continue
  }

  for (const [condition, target] of Object.entries(conditions)) {
    await verifyTarget(target, exportName, condition)
  }
}
