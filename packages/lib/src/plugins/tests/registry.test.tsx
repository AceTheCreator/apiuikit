import { describe, expect, it } from "vitest";
import { definePlugin } from "../types";
import { createPluginSlotRegistry } from "../registry";

describe("createPluginSlotRegistry", () => {
  it("indexes supplementary and tab fills in registration order", () => {
    const Supplementary = () => <div>supplementary</div>;
    const FirstTab = () => <div>first</div>;
    const SecondTab = () => <div>second</div>;

    const registry = createPluginSlotRegistry([
      definePlugin({
        name: "first",
        slots: {
          "openapi.operation.reference.supplementary": Supplementary,
          "openapi.operation.tab": { label: "First", component: FirstTab },
        },
      }),
      definePlugin({
        name: "second",
        slots: {
          "openapi.operation.tab": { label: "Second", component: SecondTab },
        },
      }),
    ]);

    const supplementary = registry.get("openapi.operation.reference.supplementary") as
      readonly { id: string; pluginName: string; Component: unknown }[];
    const tabs = registry.get("openapi.operation.tab") as
      readonly { id: string; pluginName: string; label: string; Component: unknown }[];

    expect(supplementary.map(({ pluginName, Component }) => ({ pluginName, Component }))).toEqual([
      { pluginName: "first", Component: Supplementary },
    ]);
    expect(tabs.map(({ pluginName, label, Component }) => ({ pluginName, label, Component }))).toEqual([
      { pluginName: "first", label: "First", Component: FirstTab },
      { pluginName: "second", label: "Second", Component: SecondTab },
    ]);
    expect(new Set([...supplementary, ...tabs].map(({ id }) => id)).size).toEqual(3);
  });

  it("generates distinct ids for duplicate and reserved plugin names", () => {
    const registry = createPluginSlotRegistry([
      definePlugin({
        name: "reference",
        slots: { "openapi.operation.tab": { label: "First", component: () => null } },
      }),
      definePlugin({
        name: "reference",
        slots: { "openapi.operation.tab": { label: "Second", component: () => null } },
      }),
    ]);

    const entries = registry.get("openapi.operation.tab") as readonly { id: string }[];
    expect(new Set(entries.map(({ id }) => id)).size).toEqual(2);
    expect(entries.every(({ id }) => id !== "reference")).toBe(true);
  });

  it("keeps plugin ids stable when registration order changes", () => {
    const first = definePlugin({
      name: "first",
      slots: { "openapi.operation.reference.supplementary": () => null },
    });
    const second = definePlugin({
      name: "second",
      slots: { "openapi.operation.reference.supplementary": () => null },
    });
    const idsByName = (plugins: typeof first[]) => {
      const entries = createPluginSlotRegistry(plugins).get(
        "openapi.operation.reference.supplementary",
      ) as readonly { id: string; pluginName: string }[];
      return Object.fromEntries(entries.map(({ id, pluginName }) => [pluginName, id]));
    };

    expect(idsByName([first, second])).toEqual(idsByName([second, first]));
  });

  it("returns the same indexed array for repeated lookups", () => {
    const registry = createPluginSlotRegistry([
      definePlugin({
        name: "plugin",
        slots: { "openapi.operation.reference.supplementary": () => null },
      }),
    ]);

    expect(registry.get("openapi.operation.reference.supplementary")).toBe(
      registry.get("openapi.operation.reference.supplementary"),
    );
  });
});
