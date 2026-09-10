import type { ReactNode } from "react";
import { useDocumentContext } from "../contexts";
import { useAutoHideOnScroll } from "../utils/useAutoHideOnScroll";
import { useElementRect } from "../utils/useElementRect";
import { useScrollClipAncestor } from "../utils/useScrollClipAncestor";
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

  // `position: fixed` always resolves against the true browser viewport, not
  // whatever ancestor is actually scrolling. That's right when the widget
  // fills the page, but when it's embedded in a bounded, independently
  // scrolling pane elsewhere on a longer host page (e.g. a settings-page
  // preview), scrolling *inside* that pane still moves rootElement's own
  // rect — often deep into negative territory — even though the pane itself
  // hasn't moved. Anchoring to `topOffset` alone then pins the bar to the
  // real page top instead of the pane's visible top edge. The clip
  // ancestor's rect doesn't move just because its content scrolled, so it's
  // the stable anchor to use when one exists; falling back to the viewport
  // top (0) reproduces today's behavior for full-page hosts.
  const clipAncestor = useScrollClipAncestor(rootElement);
  const clipRect = useElementRect(clipAncestor, isPinnedToViewport);
  const topAnchor = clipRect ? Math.max(clipRect.top, 0) : 0;
  const pinnedTop = Math.max(topOffset, topAnchor) + TOP_INSET;

  // How far up the bar has to travel to clear its anchor entirely. This was
  // `translateY(-150%)`, but a transform percentage resolves against the
  // element's *own height* — a flat 60px — which says nothing about how far
  // down the anchor the bar actually starts. With the default `pinnedTop` of
  // `TOP_INSET` that happened to clear it; with a host navbar's height in
  // `topOffset`, or a clip ancestor starting lower on the page, the bar
  // starts lower than 60px from the top, so "hidden" parked it on-screen
  // instead. Measured from the top edge down.
  //
  // Only ever applied while pinned to the viewport: `mode === "hidden"`
  // implies `isPinnedToViewport`, so `top` really is `pinnedTop`.
  const hiddenOffset = pinnedTop - OVERLAP_PULL + BAR_HEIGHT + HIDE_SLACK;

  const style: React.CSSProperties = {
    left: isPinnedToViewport ? visibleLeft + EDGE_INSET : EDGE_INSET,
    right: isPinnedToViewport
      ? Math.max(viewportWidth - visibleRight, 0) + EDGE_INSET
      : EDGE_INSET,
    transform: `translateY(${mode === "hidden" ? `-${hiddenOffset}px` : "0px"})`,
    ...(isPinnedToViewport
      ? {
          position: "fixed",
          top: pinnedTop,
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
