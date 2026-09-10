---
"apiuikit": minor
---

Add `theme.mode` (`"light" | "dark" | "system"`) so the library switches between `theme.light` and `theme.dark` itself, instead of requiring consumers to rebuild the `theme` config object every time their own toggle changes. `"system"` follows the OS `prefers-color-scheme` setting live. Left unset, `mode` preserves prior behavior exactly — whichever single one of `light`/`dark` you provided is used, with `light` winning if you provided both (or neither) — so existing configs render unchanged.
