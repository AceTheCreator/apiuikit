import { describe, expect, it } from "vitest";
import { arazzoKeyAnchor, parseArazzoKey, stepKey, workflowKey } from "../arazzoAnchors";

describe("Arazzo keys", () => {
  it("keeps keys of well-formed IDs as written, so existing deep links still work", () => {
    expect(workflowKey("apply-coupon")).toBe("apply-coupon");
    expect(stepKey("apply-coupon", "find_pet")).toBe("apply-coupon/find_pet");
    expect(parseArazzoKey("apply-coupon/find_pet")).toEqual({ workflowId: "apply-coupon", stepId: "find_pet" });
    expect(parseArazzoKey("apply-coupon")).toEqual({ workflowId: "apply-coupon" });
  });

  it("round-trips IDs containing the separator", () => {
    // Without encoding, "work/flow" would read back as workflow "work", step "flow".
    expect(parseArazzoKey(workflowKey("work/flow"))).toEqual({ workflowId: "work/flow" });
    expect(parseArazzoKey(stepKey("work/flow", "find/pet"))).toEqual({ workflowId: "work/flow", stepId: "find/pet" });
    expect(parseArazzoKey(stepKey("a%b", "c d"))).toEqual({ workflowId: "a%b", stepId: "c d" });
  });

  it("anchors a key to its own workflow or step", () => {
    expect(arazzoKeyAnchor(workflowKey("work/flow"))).toBe("workflow-work/flow");
    expect(arazzoKeyAnchor(stepKey("work/flow", "find-pet"))).toBe("step-work/flow/find-pet");
  });

  it("reads a malformed escape as written instead of throwing", () => {
    expect(parseArazzoKey("bad%E0%A4")).toEqual({ workflowId: "bad%E0%A4" });
  });
});
