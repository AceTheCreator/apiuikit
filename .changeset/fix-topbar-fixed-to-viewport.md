---
"apiuikit": patch
---

Fix the document toolbar (search + "Copy as Markdown") pinning to the true browser viewport instead of the widget's own scrollable container when the widget is embedded in a bounded, independently-scrolling pane elsewhere on a host page (e.g. a settings-page preview). Scrolling inside such a pane moved the widget root's own rect deeply negative even though the pane itself hadn't moved, so the toolbar snapped to the top of the browser window instead of staying pinned to the pane's visible top edge. The toolbar now anchors to the nearest ancestor that's actually clipping/scrolling the widget, when one exists.
