import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PluginSlot, useOperationTabPlugins } from "../PluginSlot";
import { definePlugin } from "../types";
import type { ApiuikitPlugin, OpenAPIOperationPluginContext } from "../types";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../components/schema/depthColors";
import type { OpenAPIDocumentData } from "../../types/openapi";

const CONTEXT: OpenAPIOperationPluginContext = {
  document: {} as OpenAPIDocumentData,
  method: "get",
  path: "/pets/{petId}",
};

function withPlugins(plugins: ApiuikitPlugin[] | undefined, children: React.ReactNode) {
  return (
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document: {} as OpenAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
        plugins,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

describe("PluginSlot", () => {
  // @ts-expect-error Tab slots use { label, component } fills and must be
  // consumed through useOperationTabPlugins, not rendered as inline slots.
  const tabAsInlineSlot = <PluginSlot name="openapi.operation.tab" context={CONTEXT} />;
  void tabAsInlineSlot;

  it("renders nothing when no plugins are registered", () => {
    const { container } = render(
      withPlugins(undefined, <PluginSlot name="openapi.operation.reference.supplementary" context={CONTEXT} />),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no registered plugin fills the requested slot", () => {
    const other = definePlugin({ name: "other", slots: { "asyncapi.operation.reference.supplementary": () => <div>async</div> } });
    const { container } = render(
      withPlugins([other], <PluginSlot name="openapi.operation.reference.supplementary" context={CONTEXT} />),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a plugin's slot component with the given context", () => {
    const plugin = definePlugin({
      name: "try-it-out",
      slots: {
        "openapi.operation.reference.supplementary": ({ method, path }) => (
          <button>
            {method.toUpperCase()} {path}
          </button>
        ),
      },
    });
    render(withPlugins([plugin], <PluginSlot name="openapi.operation.reference.supplementary" context={CONTEXT} />));
    expect(screen.getByRole("button", { name: "GET /pets/{petId}" })).toBeInTheDocument();
  });

  it("renders every plugin filling the slot, in registration order, isolating a throwing one in its own boundary", () => {
    const onErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const before = definePlugin({
      name: "before",
      slots: { "openapi.operation.reference.supplementary": () => <span>before</span> },
    });
    const broken = definePlugin({
      name: "broken",
      slots: {
        "openapi.operation.reference.supplementary": () => {
          throw new Error("plugin exploded");
        },
      },
    });
    const after = definePlugin({
      name: "after",
      slots: { "openapi.operation.reference.supplementary": () => <span>after</span> },
    });

    render(
      withPlugins([before, broken, after], <PluginSlot name="openapi.operation.reference.supplementary" context={CONTEXT} />),
    );

    expect(screen.getByText("before")).toBeInTheDocument();
    expect(screen.getByText("after")).toBeInTheDocument();

    onErrorSpy.mockRestore();
  });
});

describe("useOperationTabPlugins", () => {
  function Probe({ name }: { name: "openapi.operation.tab" }) {
    const entries = useOperationTabPlugins(name);
    return (
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>{entry.id}: {entry.pluginName}: {entry.label}</li>
        ))}
      </ul>
    );
  }

  it("returns nothing when no plugin fills the tab slot", () => {
    const { container } = render(withPlugins(undefined, <Probe name="openapi.operation.tab" />));
    expect(container.querySelector("li")).toBeNull();
  });

  it("resolves each plugin's id, label and component, in registration order", () => {
    const first = definePlugin({
      name: "first",
      slots: { "openapi.operation.tab": { label: "First", component: () => <div>first</div> } },
    });
    const second = definePlugin({
      name: "second",
      slots: { "openapi.operation.tab": { label: "Second", component: () => <div>second</div> } },
    });

    render(withPlugins([first, second], <Probe name="openapi.operation.tab" />));

    const items = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(items).toEqual([
      "openapi-operation-tab-plugin-0: first: First",
      "openapi-operation-tab-plugin-1: second: Second",
    ]);
  });

  it("ignores plugins that don't fill the requested tab slot", () => {
    const supplementaryOnly = definePlugin({
      name: "supplementary-only",
      slots: { "openapi.operation.reference.supplementary": () => <div>supplementary</div> },
    });

    const { container } = render(withPlugins([supplementaryOnly], <Probe name="openapi.operation.tab" />));
    expect(container.querySelector("li")).toBeNull();
  });
});
