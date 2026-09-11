---
"apiuikit": minor
---

Expose the resolved theme mode (`"light"` | `"dark"`) on `useDocumentContext()` as `resolvedMode`. Plugins that read raw hex values out of `config.theme` (rather than the recommended CSS custom properties) previously had no way to tell which of `theme.light`/`theme.dark` was actually active now that `mode` can make either one win — `resolvedMode` gives them the same answer apiuikit's own chrome uses.
