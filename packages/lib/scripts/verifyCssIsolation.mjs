import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

const ROOT = '.apiuikit-root'
const cssPath = fileURLToPath(new URL('../dist/apiuikit.css', import.meta.url))
const root = postcss.parse(readFileSync(cssPath, 'utf8'))

const isInsideKeyframes = (rule) => {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true
    parent = parent.parent
  }
  return false
}

const selectorsOf = (rule) =>
  selectorParser().astSync(rule.selector).nodes.map((selector) => selector.toString().trim())

const isLayered = (rule) => {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && parent.name === 'layer') return true
    parent = parent.parent
  }
  return false
}

const rules = []
root.walkRules((rule) => {
  if (isInsideKeyframes(rule)) return

  const selectors = selectorsOf(rule)
  for (const selector of selectors) {
    if (!selector.includes(ROOT)) {
      throw new Error(
        `[apiuikit] CSS isolation check failed: unscoped selector ${selector}`,
      )
    }
  }

  rules.push({ rule, selectors, layered: isLayered(rule) })
})

const hasDeclaration = (rule, property, value) =>
  rule.nodes?.some(
    (node) =>
      node.type === 'decl' &&
      node.prop === property &&
      (value === undefined || node.value === value),
  ) ?? false

const requiredRules = [
  { selector: `${ROOT} .hidden`, property: 'display', value: 'none' },
  { selector: `${ROOT} .\\@sm\\:block`, property: 'display', value: 'block' },
  { selector: `${ROOT} .flex-col`, property: 'flex-direction', value: 'column' },
  { selector: `${ROOT} .\\@lg\\:flex-row`, property: 'flex-direction', value: 'row' },
  { selector: `${ROOT} .hljs` },
  // Unlike optional font tokens, spacing is referenced by generated layout
  // utilities and therefore proves the scoped Tailwind theme was emitted.
  { selector: ROOT, property: '--spacing' },
  { selector: `${ROOT} *`, property: 'box-sizing', value: 'border-box', unlayered: true },
  { selector: `${ROOT} h1`, property: 'font-size', value: 'inherit', unlayered: true },
  { selector: `${ROOT} a`, property: 'color', value: 'inherit', unlayered: true },
  { selector: `${ROOT} button`, property: 'font', value: 'inherit', unlayered: true },
  { selector: `${ROOT} ul`, property: 'list-style', value: 'none', unlayered: true },
  { selector: `${ROOT} img`, property: 'max-width', value: '100%', unlayered: true },
  { selector: `${ROOT} table`, property: 'border-collapse', value: 'collapse', unlayered: true },
  { selector: `${ROOT} hr`, property: 'border-top-width', value: '1px', unlayered: true },
]

for (const expected of requiredRules) {
  const found = rules.some(
    ({ rule, selectors, layered }) =>
      selectors.includes(expected.selector) &&
      (!expected.property || hasDeclaration(rule, expected.property, expected.value)) &&
      (!expected.unlayered || !layered),
  )

  if (!found) {
    const declaration = expected.property
      ? ` with ${expected.property}${expected.value === undefined ? '' : `: ${expected.value}`}`
      : ''
    const layer = expected.unlayered ? ' outside any cascade layer' : ''
    throw new Error(
      `[apiuikit] CSS isolation check failed: missing ${expected.selector}${declaration}${layer}`,
    )
  }
}
