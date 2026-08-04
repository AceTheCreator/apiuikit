const HIGHLIGHT_NAME = "search-match";

const supportsHighlightApi = () =>
  typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

function findTextRanges(root: Node, query: string): Range[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const haystack = (node.textContent ?? "").toLowerCase();
    let fromIndex = 0;
    for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, fromIndex)) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + needle.length);
      ranges.push(range);
      fromIndex = index + needle.length;
    }
  }
  return ranges;
}

// Highlights every literal occurrence of `query` inside `root` using the CSS
// Custom Highlight API — no DOM mutation, so it can't conflict with React's
// own reconciliation of that subtree. Unsupported browsers (no highlight,
// still scroll to the match) degrade silently.
export function highlightSearchMatch(root: Element, query: string): void {
  if (!supportsHighlightApi()) return;

  const ranges = findTextRanges(root, query);
  if (!ranges.length) {
    CSS.highlights.delete(HIGHLIGHT_NAME);
    return;
  }
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
}

export function clearSearchHighlight(): void {
  if (!supportsHighlightApi()) return;
  CSS.highlights.delete(HIGHLIGHT_NAME);
}
