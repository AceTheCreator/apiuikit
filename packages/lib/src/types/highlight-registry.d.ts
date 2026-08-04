export {};

// TypeScript's bundled DOM lib only models `HighlightRegistry.forEach` —
// the maplike `set`/`delete`/`has` members from the CSS Custom Highlight API
// spec (https://drafts.csswg.org/css-highlight-api-1/#registry) aren't
// generated yet, so this fills in the gap.
declare global {
  interface HighlightRegistry {
    set(name: string, highlight: Highlight): HighlightRegistry;
    delete(name: string): boolean;
    has(name: string): boolean;
    clear(): void;
    readonly size: number;
  }
}
