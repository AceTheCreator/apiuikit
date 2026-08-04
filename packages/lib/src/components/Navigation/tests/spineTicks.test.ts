import { describe, expect, it } from "vitest";
import { allocateSpineTicks, spineTickBudget } from "../spineTicks";

const total = (counts: number[]) => counts.reduce((sum, count) => sum + count, 0);

describe("allocateSpineTicks", () => {
  it("gives every item its own tick when the whole spine fits", () => {
    expect(allocateSpineTicks([3, 12, 5], 100)).toEqual([3, 12, 5]);
  });

  it("gives every item its own tick at exactly the budget", () => {
    expect(allocateSpineTicks([3, 12, 5], 20)).toEqual([3, 12, 5]);
  });

  it("stays within budget once the spine overflows", () => {
    const counts = [4, 90, 12, 31];
    expect(total(allocateSpineTicks(counts, 40))).toBeLessThanOrEqual(40);
  });

  it("keeps bigger sections visibly bigger after downsampling", () => {
    const [small, large] = allocateSpineTicks([10, 200], 40);
    expect(large).toBeGreaterThan(small);
  });

  it("never drops a section below one tick, even on an impossible budget", () => {
    expect(allocateSpineTicks([50, 60, 70], 2)).toEqual([1, 1, 1]);
  });

  it("never hands a section more ticks than it has items", () => {
    const counts = [1, 1, 400];
    allocateSpineTicks(counts, 60).forEach((ticks, i) => {
      expect(ticks).toBeLessThanOrEqual(counts[i]);
    });
  });

  it("handles an empty spine", () => {
    expect(allocateSpineTicks([], 40)).toEqual([]);
  });
});

describe("spineTickBudget", () => {
  /** Rebuilds the rendered height the budget implies, to check it honours the 70vh cap. */
  const renderedHeight = (itemTicks: number, sectionCount: number) =>
    itemTicks * 6 + sectionCount * 6 + Math.max(0, sectionCount - 1) * 12 + 8 * 2;

  it("keeps the spine inside 70% of the viewport", () => {
    for (const viewportHeight of [600, 800, 1080, 1440]) {
      const budget = spineTickBudget(viewportHeight, 4);
      expect(renderedHeight(budget, 4)).toBeLessThanOrEqual(viewportHeight * 0.7);
    }
  });

  it("allows more ticks on a taller viewport", () => {
    expect(spineTickBudget(1440, 4)).toBeGreaterThan(spineTickBudget(700, 4));
  });

  it("leaves fewer ticks for items as sections take up more of the rail", () => {
    expect(spineTickBudget(900, 8)).toBeLessThan(spineTickBudget(900, 2));
  });

  it("never returns a budget below one tick, even on a tiny viewport", () => {
    expect(spineTickBudget(50, 6)).toBe(1);
  });

  it("does not cap during server-side rendering, where there is no viewport", () => {
    expect(spineTickBudget(0, 4)).toBe(Infinity);
  });
});
