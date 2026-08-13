import tailwindcss from '@tailwindcss/postcss'
import selectorParser from 'postcss-selector-parser'

const ROOT = 'apiuikit-root'
const PREFLIGHT_LAYER = 'apiuikit-preflight'

function isInLayer(rule, layerName) {
  let parent = rule.parent

  while (parent) {
    if (parent.type === 'atrule' && parent.name === 'layer') {
      return parent.params === layerName
    }
    parent = parent.parent
  }

  return false
}

function scopeSelectorList(selectorList) {
  return selectorParser((selectors) => {
    const scoped = new Set()

    for (const selector of [...selectors.nodes]) {
      const value = selector.toString().trim()

      // Preflight targets the page roots to establish inherited defaults. In
      // an embedded widget, our component root is the equivalent boundary.
      if (value === 'html' || value === ':host' || value === 'body') {
        scoped.add(`.${ROOT}`)
        continue
      }

      // The universal and pseudo-element resets must also apply to the root
      // element itself, not only to its descendants.
      if (value === '*') scoped.add(`.${ROOT}`)
      if (value.startsWith('::')) scoped.add(`.${ROOT}${value}`)

      scoped.add(`.${ROOT} ${value}`)
    }

    selectors.removeAll()
    for (const value of scoped) {
      const parsed = selectorParser().astSync(value)
      selectors.append(parsed.first)
    }
  }).processSync(selectorList)
}

/** Scope selectors emitted by dependencies that Tailwind's `important`
 * selector does not cover: Preflight, property fallbacks, theme roots, and
 * Highlight.js. Preflight is unlayered after scoping so ordinary unlayered
 * host element rules cannot override the widget reset merely by being outside
 * a cascade layer. */
function scopeLibraryGlobals() {
  return {
    postcssPlugin: 'apiuikit-scope-library-globals',
    Rule(rule) {
      if (!rule.selector) return

      if (
        isInLayer(rule, PREFLIGHT_LAYER) ||
        isInLayer(rule, 'base') ||
        isInLayer(rule, 'properties')
      ) {
        rule.selector = scopeSelectorList(rule.selector)
        return
      }

      const isThemeRoot = /(^|,)\s*:(root|host)\s*(,|$)/.test(rule.selector)
      const isHighlight = rule.selector.includes('.hljs')
      if (!isThemeRoot && !isHighlight) return

      rule.selector = selectorParser((selectors) => {
        selectors.each((selector) => {
          selector.walkPseudos((pseudo) => {
            if (pseudo.value === ':root' || pseudo.value === ':host') {
              pseudo.replaceWith(selectorParser.className({ value: ROOT }))
            }
          })

          if (isHighlight && !selector.toString().includes(`.${ROOT}`)) {
            selector.prepend(selectorParser.combinator({ value: ' ' }))
            selector.prepend(selectorParser.className({ value: ROOT }))
          }
        })
      }).processSync(rule.selector)
    },
    OnceExit(root) {
      root.walkAtRules('layer', (layer) => {
        if (layer.params !== PREFLIGHT_LAYER || !layer.nodes) return
        layer.replaceWith(...layer.nodes)
      })
    },
  }
}

scopeLibraryGlobals.postcss = true

export default {
  plugins: [tailwindcss(), scopeLibraryGlobals()],
}
