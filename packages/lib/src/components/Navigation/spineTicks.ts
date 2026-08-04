/**
 * Sizing for the navigation spine's tick rail.
 *
 * The spine is fixed to the viewport's vertical center, so on a document with
 * hundreds of operations a tick per item would run off both ends of the screen.
 * These two functions cap it instead: `spineTickBudget` works out how many item
 * ticks fit, and `allocateSpineTicks` shares that budget out across sections.
 *
 * The px values below mirror the spine's Tailwind classes in Navigation.tsx and
 * have to move with them.
 */

/** One tick (2px) plus the `gap-1` beneath it. */
const TICK_PITCH = 6;
/** The `gap-3` between one section's tick group and the next. */
const SECTION_GAP = 12;
/** The spine's `p-2`, top and bottom. */
const PADDING = 8;
/** Share of viewport height the spine may occupy, matching the popover's `max-h-[70vh]`. */
const MAX_HEIGHT_RATIO = 0.7;

/**
 * How many item ticks fit in the spine's share of the viewport, once each
 * section's own parent tick and the gaps between sections are paid for.
 * A zero `viewportHeight` means server-side rendering, where there's no
 * viewport to cap against.
 */
export function spineTickBudget(viewportHeight: number, sectionCount: number): number {
  if (viewportHeight === 0) return Infinity;
  const available = viewportHeight * MAX_HEIGHT_RATIO - PADDING * 2;
  const sectionOverhead =
    sectionCount * TICK_PITCH + Math.max(0, sectionCount - 1) * SECTION_GAP;
  return Math.max(1, Math.floor((available - sectionOverhead) / TICK_PITCH));
}

/**
 * Hands out `budget` item ticks across sections holding `counts` items each.
 *
 * Under budget, every item keeps its own tick. Over it, each section is
 * guaranteed one tick and the rest is shared out in proportion to size, so a
 * section stays visibly bigger than its neighbours even once its ticks stand
 * for several items apiece. Rounding down can leave a few ticks of the budget
 * unspent, which only makes the spine slightly shorter than its cap.
 */
export function allocateSpineTicks(counts: number[], budget: number): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= budget) return counts;
  if (budget <= counts.length) return counts.map(() => 1);

  const spare = budget - counts.length;
  return counts.map((count) => Math.min(count, 1 + Math.floor((count / total) * spare)));
}
