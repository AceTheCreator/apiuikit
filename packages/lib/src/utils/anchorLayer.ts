/** Which side of its anchor a floating layer ended up on. */
export type LayerPlacement = "top" | "bottom";

/**
 * How the layer lines up horizontally with its anchor. `center` layers are
 * rendered with a `-translate-x-1/2`, so `left` is the anchor's midpoint;
 * `end` ones are positioned by their own left edge and need `width`.
 */
export type LayerAlign = "center" | "end";

export interface AnchorPosition {
  top: number;
  left: number;
  placement: LayerPlacement;
}

interface AnchorOptions {
  align?: LayerAlign;
  /** Gap between the anchor's edge and the layer. */
  gap?: number;
  /** Room the layer needs above the anchor before it flips below instead. */
  clearance?: number;
  /** The layer's own width. Required by `end` alignment to keep it on-screen. */
  width?: number;
  /** Keep-out margin from the viewport's left/right edges. */
  margin?: number;
}

/**
 * Viewport coordinates for a `position: fixed` layer (tooltip, popover)
 * anchored to `anchor`, flipping below when there isn't room above and
 * clamping horizontally so an `end`-aligned layer never runs off-screen.
 *
 * Shared by every floating layer in the address bar — the per-parameter
 * tooltips, the full-address peek, and the query parameter popover — so they
 * all flip and clamp by the same rules.
 */
export function computeAnchorPosition(
  anchor: HTMLElement,
  { align = "center", gap = 8, clearance = 40, width = 0, margin = 8 }: AnchorOptions = {},
): AnchorPosition {
  const rect = anchor.getBoundingClientRect();
  const placement: LayerPlacement = rect.top < clearance ? "bottom" : "top";
  const top = placement === "top" ? rect.top - gap : rect.bottom + gap;

  if (align === "center") {
    return { top, left: rect.left + rect.width / 2, placement };
  }

  // Right edges flush with the anchor's, then pulled back inside the viewport
  // if that would overflow — `max` last so a layer wider than the viewport
  // still starts at the left margin rather than off-screen.
  const preferredLeft = rect.right - width;
  const maxLeft = window.innerWidth - width - margin;
  return { top, left: Math.max(margin, Math.min(preferredLeft, maxLeft)), placement };
}
