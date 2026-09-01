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

    expect(registry.get("openapi.operation.reference.supplementary")).toEqual([
      Supplementary,
    ]);
    expect(registry.get("openapi.operation.tab")).toEqual([
      { id: "first", label: "First", Component: FirstTab },
      { id: "second", label: "Second", Component: SecondTab },
    ]);
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
