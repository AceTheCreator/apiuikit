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

  const style: React.CSSProperties = {
    left: isPinnedToViewport ? visibleLeft + EDGE_INSET : EDGE_INSET,
    right: isPinnedToViewport
      ? Math.max(viewportWidth - visibleRight, 0) + EDGE_INSET
      : EDGE_INSET,
    transform: `translateY(${mode === "hidden" ? "-150%" : "0px"})`,
    ...(isPinnedToViewport
      ? {
          position: "fixed",
          top: topOffset + 10,
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
