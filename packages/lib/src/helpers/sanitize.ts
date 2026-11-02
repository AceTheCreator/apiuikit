import { useSyncExternalStore } from "react";
import DOMPurify from "dompurify";

// DOMPurify needs a real DOM. Without one (server rendering, static site
// generation) it reports `isSupported: false`, and `sanitize()` then returns
// its input *unchanged*, so every call site has to check this first.
//
// We used to ship `isomorphic-dompurify` to get a DOM on the server, but its
// Node variant pulls in jsdom, which can't be bundled: Docusaurus, Rspack and
// other SSG builds that bundle the server render fail on jsdom's
// `readFileSync(__dirname + ...)`. Server output is instead made safe at the
// source (see `renderMarkdown`'s `serverSafe` option), and DOMPurify takes
// over once the page is running in a browser.
export function canSanitizeHtml(): boolean {
  return DOMPurify.isSupported;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

const subscribe = () => () => {};

/**
 * True once rendering happens against a real DOM. It is false during server
 * rendering *and* during hydration (React uses the server snapshot for the
 * first client pass), then flips to true right after hydration, so markup
 * produced from it never mismatches the server HTML. A client-only render
 * (`createRoot`, no SSR) gets true on its very first render.
 */
export function useCanSanitizeHtml(): boolean {
  return useSyncExternalStore(subscribe, canSanitizeHtml, () => false);
}
