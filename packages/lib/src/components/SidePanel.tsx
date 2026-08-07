import { forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAsyncAPIDocument } from "../contexts";
import { getScrollLockTarget, lockScroll } from "../utils/scrollLock";
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

  const { portalHost, rootElement } = useAsyncAPIDocument();

  useEffect(() => {
    if (!isOpen || !portalHost) return;
    return lockScroll(getScrollLockTarget(portalHost));
  }, [isOpen, portalHost]);

  // Stays full viewport height (`top: 0` / `height: 100vh`) so it's always visible
  // regardless of page scroll, same as before — but only horizontally scoped to
  // Layout's own root element, so it slides in from the widget's own left/right
  // edge instead of the browser window's. (Unlike vertical position, an element's
  // horizontal bounds don't shift as the page is scrolled, so this doesn't need to
  // track the widget's full — possibly much taller than the viewport — rect.top.)
  // Tracked continuously (not gated on isOpen) — the panel keeps animating for
  // `duration-300` after isOpen flips false, so it still needs a correct rect
  // during the close transition, not an immediate reset to the fallback.
  const rect = useElementRect(rootElement, true);
  const overlayStyle: React.CSSProperties = rect
    ? { position: "fixed", top: 0, left: rect.left, width: rect.width, height: "100vh" }
    : { position: "fixed", inset: 0 };

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

      <div
        ref={ref}
        className={`absolute top-0 ${panelPosition} h-full ${width} max-w-[100cqw] bg-background shadow-xl flex flex-col transition-transform duration-300 ease-in-out`}
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
