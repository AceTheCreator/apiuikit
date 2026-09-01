import type { ReactNode } from "react";
import { useDocumentContext } from "../contexts";
import { useAutoHideOnScroll } from "../utils/useAutoHideOnScroll";
import { useElementRect } from "../utils/useElementRect";
import { SECTION_COLUMNS_WIDTH } from "./Section";

interface DocumentTopBarProps {
  logo?: ReactNode;
  children?: ReactNode;
  /** Keeps the bar visible while one of its controls is open. */
  forceVisible?: boolean;
}

const EDGE_INSET = 16;

/**
 * The bar's own vertical geometry, mirroring `.document-topbar` in index.css —
 * its `top`, its `margin-top` pull, and its `height`. Kept here because the
 * hide transform has to travel past all three, and a transform can't read
 * them itself. Change one of these and change the stylesheet with it.
 */
const TOP_INSET = 10;
const OVERLAP_PULL = 10;
const BAR_HEIGHT = 40;

/** A little past the edge, so a shadow or focus ring doesn't peek while hidden. */
const HIDE_SLACK = 8;

/**
 * Shared masthead for document branding and actions. Positioning and the
 * scroll hide/reveal transition live here so every child moves as one unit.
 */
export default function DocumentTopBar({
  logo,
  children,
  forceVisible = false,
}: DocumentTopBarProps) {
  const { rootElement, topOffset = 0 } = useDocumentContext();
  const mode = useAutoHideOnScroll(rootElement, forceVisible);
  const isPinnedToViewport = mode !== "docked";
  const rootRect = useElementRect(rootElement, isPinnedToViewport);
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;

  const visibleLeft = rootRect ? Math.max(rootRect.left, 0) : 0;
  const visibleRight = rootRect
    ? Math.min(rootRect.right, viewportWidth)
    : viewportWidth;

  // How far up the bar has to travel to clear the viewport entirely. This was
  // `translateY(-150%)`, but a transform percentage resolves against the
  // element's *own height* — a flat 60px — which says nothing about how far
  // down the viewport the bar actually starts. With the default `topOffset` of
  // 0 that happened to clear it; with a host navbar's height in `topOffset`
  // (what the option is for) the bar starts lower than 60px from the top, so
  // "hidden" parked it on-screen instead. Measured from the top edge down.
  //
  // Only ever applied while pinned to the viewport: `mode === "hidden"`
  // implies `isPinnedToViewport`, so `top` really is `topOffset + TOP_INSET`.
  const hiddenOffset = topOffset + TOP_INSET - OVERLAP_PULL + BAR_HEIGHT + HIDE_SLACK;

  const style: React.CSSProperties = {
    left: isPinnedToViewport ? visibleLeft + EDGE_INSET : EDGE_INSET,
    right: isPinnedToViewport
      ? Math.max(viewportWidth - visibleRight, 0) + EDGE_INSET
      : EDGE_INSET,
    transform: `translateY(${mode === "hidden" ? `-${hiddenOffset}px` : "0px"})`,
    ...(isPinnedToViewport
      ? {
          position: "fixed",
          top: topOffset + TOP_INSET,
          pointerEvents: mode === "hidden" ? "none" : undefined,
        }
      : {}),
  };

  return (
    <header className="document-topbar" style={style} aria-label="Document toolbar">
      <div className={`document-topbar-inner w-full ${SECTION_COLUMNS_WIDTH}`}>
        <div className="document-logo">{logo}</div>
        <div className="document-topbar-controls">{children}</div>
      </div>
    </header>
  );
}
