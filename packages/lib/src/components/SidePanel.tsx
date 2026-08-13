import { forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAsyncAPIDocument } from "../contexts";
import {
  getContainedScrollLockTarget,
  getScrollLockTarget,
  lockScroll,
} from "../utils/scrollLock";
import { useElementRect } from "../utils/useElementRect";

export type SidePanelSide = "left" | "right";

export interface ISidePanelProps {
  isOpen: boolean;
  side: SidePanelSide;
  onClose: () => void;
  title?: string | React.ReactNode;
  /** Rendered in the header row between the title and the close button (e.g. a copy button). */
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  width?: string;
}

export const SidePanel = forwardRef<HTMLDivElement, ISidePanelProps>(function SidePanel({ isOpen, side, onClose, title, headerActions, children, width = "w-[50rem]" }, ref) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const panelPosition = side === "right" ? "right-0" : "left-0";
  // Uses an inline `transform` instead of Tailwind's `translate-x-full` utility: that
  // utility emits the standalone CSS `translate` property, whose value depends on the
  // `--tw-translate-y` custom property being registered (via `@property`) with a zero
  // initial value. When that registration doesn't take effect in the consuming page
  // (e.g. `@property` stripped by a CSS processor, or shadowed by another stylesheet),
  // `translate` fails to resolve and the panel never actually moves off-screen, leaving
  // its `shadow-xl` box-shadow visible at rest. `transform: translateX(...)` has no such
  // dependency and is covered by `.transition-transform`'s `transition-property` list.
  const closedTransform = side === "right" ? "translateX(100%)" : "translateX(-100%)";

  const {
    portalHost,
    rootElement,
    sidePanelContainment,
    sidePanelTopOffset = 0,
  } = useAsyncAPIDocument();
  const containToComponent = sidePanelContainment === "component";

  useEffect(() => {
    if (!isOpen || !portalHost) return;
    const target = containToComponent
      ? getContainedScrollLockTarget(portalHost, rootElement)
      : getScrollLockTarget(portalHost);
    if (!target) return;
    return lockScroll(target);
  }, [containToComponent, isOpen, portalHost, rootElement]);

  // Tracked continuously (not gated on isOpen) when containing to the widget —
  // the panel keeps animating for `duration-300` after isOpen flips false, so it
  // still needs a correct rect during the close transition, not an immediate
  // reset to the fallback.
  //
  // `"component"`: clip the overlay to the *visible* intersection of the widget's
  // root element and the browser viewport. Using the raw root rect would put
  // `top` negative (and the panel header above the screen) whenever the widget
  // is taller than the viewport and has been scrolled — which is the usual case
  // in full-page hosts like the playground. Clamping keeps the panel on-screen
  // while still staying inside the widget's horizontal/vertical bounds (e.g.
  // embed cards).
  // `"viewport"`: cover the full browser viewport edge-to-edge.
  const rect = useElementRect(rootElement, containToComponent);
  const overlayStyle: React.CSSProperties = (() => {
    if (!containToComponent) return { position: "fixed", inset: 0 };
    if (!rect) return { position: "fixed", inset: 0 };

    // A fixed host navbar is outside the widget, so its height cannot be
    // inferred from rootElement's rect. component-mode consumers can reserve
    // that host-owned safe area with sidePanel.topOffset.
    const top = Math.max(sidePanelTopOffset, rect.top);
    const left = Math.max(0, rect.left);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const right = Math.min(window.innerWidth, rect.right);

    return {
      position: "fixed",
      top,
      left,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  })();

  if (!portalHost) return null;

  return createPortal(
    <div
      className="z-50 overflow-hidden"
      style={{ ...overlayStyle, pointerEvents: isOpen ? "auto" : "none" }}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      />

      {/*
        `shadow-xl` is applied only while `isOpen`, not unconditionally. `box-shadow`'s
        blur radius paints well outside the element's own border box (shadow-xl's blur is
        25px, extending the visible paint area ~10-12px past each edge) — and that extra
        paint area is not reliably clipped by the portal overlay's `overflow: hidden` once
        this panel is a `transform`-animated, composited layer. Translating the panel
        further off-screen doesn't fix it either (the shadow still bleeds through at any
        offset up to very large ones, well past what's practical to use as a margin) —
        confirmed by testing offsets up to 32px with no change, while box-shadow: none
        removes the bleed immediately regardless of position. Since a closed, off-screen
        panel has no visible edge to cast a shadow from anyway, the simplest fix is to not
        render the shadow at all except while actually open.
      */}
      <div
        ref={ref}
        className={`absolute top-0 ${panelPosition} h-full ${width} max-w-[100cqw] bg-background ${isOpen ? "shadow-xl" : ""} flex flex-col transition-transform duration-300 ease-in-out`}
        style={{ transform: isOpen ? "translateX(0)" : closedTransform }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="text-sm font-semibold text-foreground min-w-0 flex-1 overflow-hidden">
              {typeof title === "string" ? (
                <span className="truncate block">{title}</span>
              ) : (
                title
              )}
            </div>
            {headerActions}
            <button
              onClick={onClose}
              className="ml-4 p-1 rounded hover:bg-neutral-100 text-foreground-muted hover:text-foreground-secondary transition-colors"
              aria-label="Close panel"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    portalHost,
  );
});
