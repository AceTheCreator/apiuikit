import { describe, expect, it } from "vitest";
import { buildArazzoSearchIndex } from "../arazzoSearchIndex";
import { parseArazzoDocument } from "../arazzoModel";
import { petCoupons } from "./fixtures/arazzo";

describe("buildArazzoSearchIndex", () => {
  it("indexes the info panel, each workflow, and each step with what it calls", async () => {
    const { model } = await parseArazzoDocument(petCoupons.arazzo, { sources: petCoupons.sources });
    const entries = buildArazzoSearchIndex(model!);

    expect(entries[0]).toMatchObject({ type: "info", targetId: "info-panel", name: "Petstore - Apply Coupons" });
    expect(entries.filter((entry) => entry.type === "workflow").map((entry) => entry.key)).toEqual([
      "apply-coupon",
      "buy-available-pet",
      "place-order",
    ]);

    const findPet = entries.find((entry) => entry.key === "apply-coupon/find-pet");
    expect(findPet).toMatchObject({
      type: "step",
      tab: "workflows",
      targetId: "step-apply-coupon/find-pet",
      location: "Workflows > apply-coupon > 1. find-pet",
      subtitle: "GET /pet/findByTags",
    });
    expect(findPet?.text).toContain("findPetsByTags");
    expect(findPet?.text).toContain("pet-coupons");

    expect(entries.find((entry) => entry.key === "apply-coupon/place-order")?.subtitle).toBe("workflow place-order");
  });
});
