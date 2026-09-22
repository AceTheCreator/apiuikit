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
 * The bar's full painted height, mirroring `.document-topbar` in index.css: a
 * 40px row of controls plus 16px of `padding-top`. Kept here because the hide
 * transform has to travel past it, and a transform can't read it itself.
 * Change one and change the stylesheet with it.
 *
 * The breathing room above the controls is that padding, *inside* the painted
 * bar, so the controls sit 16px from the top both in flow and when stuck. The
 * bar sticks flush at `topOffset` with no inset: it used to stick at
 * `topOffset + 10` with a `margin-top: -10px` meant to pull it flush, but a
 * stuck sticky box pins its *border* edge to `top` (margins only move it in
 * flow), which left an unpainted 10px strip the document scrolled through.
 *
 * Being sticky, the bar is in flow and takes its own space, so the layouts
 * reserve none for it. (They padded the top when it was `position: fixed`,
 * and that padding outlived the switch as dead space above the bar.)
 */
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

  const stickyTop = topOffset;

  // How far up the bar has to travel to clear its sticky position entirely.
  // This was `translateY(-150%)`, but a transform percentage resolves
  // against the element's *own height* — a flat 40px — which says nothing
  // about how far down the page the bar actually starts. With a host navbar's
  // height in `topOffset` the bar starts lower, so "hidden" parked it
  // on-screen instead. Measured from the top edge down.
  const hiddenOffset = stickyTop + BAR_HEIGHT + HIDE_SLACK;

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
