---
"apiuikit": patch
---

Fix the document toolbar's empty middle space (between the logo and the search/Copy-as-Markdown controls) painting an opaque background that obscured document content scrolling underneath it. That background came from a row spanning the toolbar's full width, painted even where there was nothing to show — the search and Copy as Markdown buttons already carry their own background for legibility, so the row itself is now transparent.
