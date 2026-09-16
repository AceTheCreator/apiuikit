---
"apiuikit": patch
---

Fix the desktop sidebar rail (and its popover) rendering relative to the browser's own viewport instead of the widget. When embedded as part of a larger page, the rail vertically centered itself on the full screen rather than the widget's own visible bounds, so it could appear detached from — or entirely outside — the rendered doc component. It now centers on whichever part of the widget is actually on screen.
