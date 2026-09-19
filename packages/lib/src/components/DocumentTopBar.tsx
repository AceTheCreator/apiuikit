import type { ReactNode } from "react";
import { useDocumentContext } from "../contexts";
import { useAutoHideOnScroll } from "../utils/useAutoHideOnScroll";
import { SECTION_COLUMNS_WIDTH } from "./Section";

interface DocumentTopBarProps {
  logo?: ReactNode;
  children?: ReactNode;
  /** Keeps the bar visible while one of its controls is open. */
  forceVisible?: boolean;
}

/**
 * The bar's own vertical geometry, mirroring `.document-topbar` in index.css —
 * its `margin-top` pull and its `height`. Kept here because the hide
 * transform has to travel past both, and a transform can't read them itself.
 * Change one of these and change the stylesheet with it.
 */
const TOP_INSET = 10;
const OVERLAP_PULL = 10;
// The bar's full painted height: a 40px row of controls plus the 16px of
// breathing room above it. That space is *padding inside the bar*, not a gap
// above it — the background has to reach the top edge, or the document scrolls
// visibly through the strip above the controls on the way back up.
const BAR_HEIGHT = 56;

/** A little past the edge, so a shadow or focus ring doesn't peek while hidden. */
const HIDE_SLACK = 8;

/**
 * Shared masthead for document branding and actions. Positioning is CSS
 * `position: sticky` (see index.css) so it sticks against whichever ancestor
 * is actually scrolling, with no JS geometry math; the scroll hide/reveal
 * transition lives here since sticky alone can't express it.
 */
export default function DocumentTopBar({
  logo,
  children,
  forceVisible = false,
}: DocumentTopBarProps) {
  const { rootElement, topOffset = 0 } = useDocumentContext();
  const mode = useAutoHideOnScroll(rootElement, forceVisible);

  const stickyTop = topOffset + TOP_INSET;

  // How far up the bar has to travel to clear its sticky position entirely.
  // This was `translateY(-150%)`, but a transform percentage resolves
  // against the element's *own height* — a flat 40px — which says nothing
  // about how far down the page the bar actually starts. With the default
  // `stickyTop` that happened to clear it; with a host navbar's height in
  // `topOffset` the bar starts lower, so "hidden" parked it on-screen
  // instead. Measured from the top edge down.
  const hiddenOffset = stickyTop - OVERLAP_PULL + BAR_HEIGHT + HIDE_SLACK;

  const style: React.CSSProperties = {
    top: stickyTop,
    transform: `translateY(${mode === "hidden" ? `-${hiddenOffset}px` : "0px"})`,
    pointerEvents: mode === "hidden" ? "none" : undefined,
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
