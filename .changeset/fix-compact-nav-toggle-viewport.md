---
"apiuikit": patch
---

Fix the compact sidebar navigation toggle (the floating circular button shown when the widget is too narrow for the tick "spine") detaching from its bounded preview pane — the same `position: fixed` viewport-relative math already fixed for the document toolbar. The button now sits in a `position: sticky` anchor instead, so it stays bottom-right of the widget's own pane rather than the true browser viewport; the popover it opens now reads its position from the button's own measured on-screen rect instead of recomputing it independently, so the two can't drift out of sync.
