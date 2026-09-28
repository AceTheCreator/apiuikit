---
"apiuikit": major
"@apiuikit/web-component": major
"x-tensions": major
---

v2: white background by default, themes that merge, and a quick nav that stays put

Breaking:

- The default light `background` is now white (`#ffffff`), not `#f8fafc`. Rendered full-page on a white page, the old grey read as a box ending wherever the content did. Hosts on a non-white page should set `theme.light.background` to their page's color — the sticky navbar, content tabs and side panels paint it too.
- A `theme` you pass is now layered over the defaults per key and per shade, instead of replacing them wholesale. Anyone who passed a config without `theme.colors.primary` was getting the stylesheet's orange fallback and will now get the documented blue accent. The light/dark decision still reads your own theme, so "only `dark` given" still renders dark.
- The desktop quick-nav rail hands over to the floating button whenever the gutter beside the content can't fit it, rather than at a fixed 1024px. Tablet and small-laptop widths (roughly 1024–1380px) previously kept the rail, where it overlapped the text; they now get the floating button.

Fixed:

- The document toolbar stuck 10px below its own painted background, so the document scrolled visibly through that strip on the way back up. It now sticks flush, with its breathing room as padding inside the bar.
- The layouts reserved 72px above the toolbar, left from when it was `position: fixed`. As a sticky element it takes its own space, so that was dead space at the top of every document.
- `.apiuikit-root` now fills a container that has a definite height, so a short document in a full-height pane no longer leaves its background — and a side panel using `sidePanel.containment: "component"` — stopping halfway down the pane.
- The quick nav's floating button is pinned by a `position: sticky; bottom: 0` anchor, which only holds while the anchor sits below the fold. Rendered mid-document, the button scrolled off screen once the reader passed it; the nav is now last in the layout.
- The desktop rail is placed against the content column rather than the widget's left edge, so on an ultra-wide screen it stays beside the content instead of drifting to the window edge, 48px clear of it.
