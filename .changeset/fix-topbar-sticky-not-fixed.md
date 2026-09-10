---
"apiuikit": patch
---

Fix the document toolbar (search + "Copy as Markdown") still detaching from its bounded preview pane in some scroll combinations after the 1.8.2 fix — most visibly when scrolling back up past where the pane's own top had scrolled offscreen, which pinned the toolbar to the true viewport top and let it overlap the document's own heading. The previous fix computed the toolbar's `position: fixed` coordinates in JS from the nearest scrolling ancestor's rect, which can't account for every combination of outer-page scroll, an ancestor's own scroll, and a host's fixed navbar at once. The toolbar now uses CSS `position: sticky` instead, so the browser resolves its position against whichever ancestor is actually scrolling every frame, with no JS geometry math and no drift.
