import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const cssPath = fileURLToPath(new URL('../dist/apiuikit.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

const required = [
  '.apiuikit-root .hidden{display:none}',
  '.apiuikit-root .\\@sm\\:block{display:block}',
  '.apiuikit-root .flex-col{flex-direction:column}',
  '.apiuikit-root .\\@lg\\:flex-row{flex-direction:row}',
  '.apiuikit-root .hljs',
  '.apiuikit-root{--font-sans',
  '.apiuikit-root,.apiuikit-root *',
  '.apiuikit-root button',
]

for (const selector of required) {
  if (!css.includes(selector)) {
    throw new Error(`[apiuikit] CSS isolation check failed: missing ${selector}`)
  }
}

const forbidden = [
  /(^|[},])\.hidden\{/,
  /(^|[},])\.flex-col\{/,
  /h1,h2,h3,h4,h5,h6\{/,
  /(^|[},])html,:host\{/,
  /(^|[},])\.hljs(?:[,{])/,
  /(^|[},])button,input,select/,
]

for (const pattern of forbidden) {
  if (pattern.test(css)) {
    throw new Error(`[apiuikit] CSS isolation check failed: global selector ${pattern}`)
  }
}

// Keep this generic so a new Tailwind/plugin selector cannot silently leak
// simply because it was not anticipated in the allow/deny lists above.
postcss.parse(css).walkRules((rule) => {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return
    parent = parent.parent
  }

  if (!rule.selector.includes('.apiuikit-root')) {
    throw new Error(
      `[apiuikit] CSS isolation check failed: unscoped rule ${rule.selector}`,
    )
  }
})
