// Arazzo documents written into the page, for sites with no JavaScript of
// their own. The Arazzo elements accept them as child script tags:
//
//   <apiuikit-arazzo-renderer>
//     <script type="application/yaml" data-arazzo>arazzo: 1.0.1 ...</script>
//     <script type="application/yaml" data-source="petstore">openapi: 3.1.0 ...</script>
//   </apiuikit-arazzo-renderer>
//
// The browser neither runs nor shows a script with a data type. The elements
// render into their own light DOM, which replaces these children on the first
// render, so they're read once, when the element first connects.

/** What an element's child scripts declare. */
export interface ArazzoDeclarations {
  /** The text of `<script data-arazzo>`, the Arazzo document itself. */
  spec?: string;
  /** The text of each `<script data-source="name">`, keyed by name. */
  sources: Record<string, string>;
}

/**
 * Removes the indentation every line shares, so YAML indented to match the
 * surrounding HTML parses the same as YAML written flush left.
 */
export function dedent(text: string): string {
  const lines = text.replace(/^\s*\n/, "").trimEnd().split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)![0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common)).join("\n");
}

/** Reads the element's direct child scripts. Nested elements' scripts belong to them. */
export function readArazzoDeclarations(element: Element): ArazzoDeclarations {
  const declarations: ArazzoDeclarations = { sources: {} };
  for (const child of Array.from(element.children)) {
    if (child.localName !== "script") continue;
    const text = dedent(child.textContent ?? "");
    if (child.hasAttribute("data-arazzo")) declarations.spec ??= text;
    const name = child.getAttribute("data-source");
    if (name) declarations.sources[name] = text;
  }
  return declarations;
}

/**
 * Sources from both places. A `sources` property entry wins over a child
 * script with the same name; the rest are combined.
 */
export function combineSources<T>(
  declared: Record<string, string> | undefined,
  sources: Record<string, T> | undefined,
): Record<string, T | string> | undefined {
  if (!declared || Object.keys(declared).length === 0) return sources;
  return { ...declared, ...sources };
}

/** The props an Arazzo element's component receives from its child scripts. */
export interface DeclaredProps {
  declaredSpec?: string;
  declaredSources?: Record<string, string>;
}

/** The hidden r2wc props carrying the declarations: property-only, never attributes. */
export const declaredPropTypes = { declaredSpec: undefined, declaredSources: undefined } as const;

type ElementClass = new () => HTMLElement & { connectedCallback(): void };

/**
 * Wraps an r2wc element class so it reads its child scripts before the first
 * render, and hands them to the component as `declaredSpec` and
 * `declaredSources`. While the page is still loading, the element's children
 * may not be parsed yet, so it waits for DOMContentLoaded.
 */
export function withArazzoDeclarations(Base: CustomElementConstructor): CustomElementConstructor {
  const Element = Base as unknown as ElementClass;
  return class extends Element {
    #read = false;

    connectedCallback() {
      if (!this.#read) {
        if (this.ownerDocument.readyState === "loading") {
          this.ownerDocument.addEventListener("DOMContentLoaded", () => this.isConnected && this.connectedCallback(), {
            once: true,
          });
          return;
        }
        this.#read = true;
        const { spec, sources } = readArazzoDeclarations(this);
        const props = this as unknown as DeclaredProps;
        if (spec !== undefined) props.declaredSpec = spec;
        if (Object.keys(sources).length) props.declaredSources = sources;
      }
      super.connectedCallback();
    }
  };
}
