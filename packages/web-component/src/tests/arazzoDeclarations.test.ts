import { afterEach, describe, expect, it, vi } from "vitest";
import { combineSources, dedent, readArazzoDeclarations, withArazzoDeclarations, type DeclaredProps } from "../arazzoDeclarations";

const html = (markup: string) => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host.firstElementChild!;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("dedent", () => {
  it("removes the indentation every line shares, keeping nesting", () => {
    expect(dedent("\n    arazzo: 1.0.1\n    info:\n      title: Flows\n  ")).toBe("arazzo: 1.0.1\ninfo:\n  title: Flows");
  });

  it("ignores blank lines when measuring", () => {
    expect(dedent("  a: 1\n\n  b: 2")).toBe("a: 1\n\nb: 2");
  });
});

describe("readArazzoDeclarations", () => {
  it("reads the document and each named source from direct child scripts", () => {
    const element = html(`
      <apiuikit-arazzo-renderer>
        <script type="application/yaml" data-arazzo>
          arazzo: 1.0.1
        </script>
        <script type="application/yaml" data-source="petstore">
          openapi: 3.1.0
        </script>
        <script type="application/json" data-source="payments">{"openapi":"3.1.0"}</script>
        <div><script type="application/yaml" data-source="nested">ignored</script></div>
        <script type="application/yaml">no name, ignored</script>
      </apiuikit-arazzo-renderer>`);

    expect(readArazzoDeclarations(element)).toEqual({
      spec: "arazzo: 1.0.1",
      sources: { petstore: "openapi: 3.1.0", payments: '{"openapi":"3.1.0"}' },
    });
  });

  it("finds nothing in an element without scripts", () => {
    expect(readArazzoDeclarations(html("<apiuikit-arazzo></apiuikit-arazzo>"))).toEqual({ sources: {} });
  });
});

describe("combineSources", () => {
  it("lets the sources property win over a child script with the same name, and keeps the rest", () => {
    const fromProperty = { petstore: { openapi: "3.1.0" } };
    expect(combineSources({ petstore: "openapi: 3.0.0", payments: "openapi: 3.1.0" }, fromProperty)).toEqual({
      petstore: fromProperty.petstore,
      payments: "openapi: 3.1.0",
    });
  });

  it("returns the property as is when there are no child scripts", () => {
    const sources = { petstore: "openapi: 3.1.0" };
    expect(combineSources({}, sources)).toBe(sources);
    expect(combineSources(undefined, undefined)).toBeUndefined();
  });
});

describe("withArazzoDeclarations", () => {
  /** Stands in for an r2wc element class: records what it had when it connected. */
  const define = (tag: string) => {
    const connected = vi.fn();
    class Base extends HTMLElement {
      declaredSpec?: string;
      declaredSources?: Record<string, string>;
      connectedCallback() {
        connected({ spec: this.declaredSpec, sources: this.declaredSources });
      }
    }
    customElements.define(tag, withArazzoDeclarations(Base));
    return connected;
  };

  it("hands the child scripts to the element before it first renders", () => {
    const connected = define("test-arazzo-a");
    document.body.innerHTML = `
      <test-arazzo-a>
        <script type="application/yaml" data-arazzo>arazzo: 1.0.1</script>
        <script type="application/yaml" data-source="petstore">openapi: 3.1.0</script>
      </test-arazzo-a>`;

    expect(connected).toHaveBeenCalledWith({ spec: "arazzo: 1.0.1", sources: { petstore: "openapi: 3.1.0" } });
  });

  it("reads them once, so moving the element after its first render keeps them", () => {
    const connected = define("test-arazzo-b");
    document.body.innerHTML = `<test-arazzo-b><script type="application/yaml" data-arazzo>arazzo: 1.0.1</script></test-arazzo-b>`;
    const element = document.querySelector("test-arazzo-b") as HTMLElement & DeclaredProps;
    // What the first render does to the element's children.
    element.replaceChildren();

    document.body.append(document.createElement("div"));
    document.body.lastElementChild!.append(element);

    expect(connected).toHaveBeenCalledTimes(2);
    expect(connected).toHaveBeenLastCalledWith({ spec: "arazzo: 1.0.1", sources: undefined });
  });

  it("waits for the page to finish parsing when connected while it's loading", () => {
    const connected = define("test-arazzo-c");
    const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const element = document.createElement("test-arazzo-c");
    document.body.append(element);
    expect(connected).not.toHaveBeenCalled();

    element.innerHTML = `<script type="application/yaml" data-source="petstore">openapi: 3.1.0</script>`;
    readyState.mockReturnValue("interactive");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(connected).toHaveBeenCalledWith({ spec: undefined, sources: { petstore: "openapi: 3.1.0" } });
  });
});
