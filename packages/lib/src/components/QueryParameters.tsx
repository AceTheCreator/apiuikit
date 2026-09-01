import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAsyncAPIDocument } from "../contexts";
import formatEnumDescription from "../helpers/formatEnumDescription";
import { computeAnchorPosition, type AnchorPosition } from "../utils/anchorLayer";
import type { ChannelAddressParameterDetail } from "./ChannelAddress";

/** A query parameter as the chip lists it: a ChannelAddress tooltip's detail plus the parts only a *named* parameter has. */
export interface QueryParameterDetail extends ChannelAddressParameterDetail {
  name: string;
  required?: boolean;
}

/** Matches the popover's `w-80`, so `end` alignment can clamp it to the viewport before it renders. */
const POPOVER_WIDTH = 320;

/**
 * The query half of an operation's address, as a chip rather than inline text.
 *
 * Spelling every query parameter into the address (`?limit={limit}&cursor=…`)
 * is what actually overflows the panel header — a handful of them dwarfs the
 * path that identifies the operation. They're a *set* rather than part of that
 * identity, so they collapse to a count here and open as a list, which also
 * gives each one room for the type/default/enum that inline text can't show.
 *
 * This is their only documentation in the panel: PathOperation deliberately
 * keeps query parameters out of the Parameters tab because they live here.
 */
export default function QueryParameters({ parameters }: { parameters: QueryParameterDetail[] }) {
  const { portalHost } = useAsyncAPIDocument();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<AnchorPosition>({ top: 0, left: 0, placement: "bottom" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Reposition on open rather than on every render: the trigger sits in a
  // panel header that can scroll under it while the list is up.
  useEffect(() => {
    if (!isOpen) return;
    const anchor = triggerRef.current;
    if (!anchor) return;

    const reposition = () =>
      setCoords(computeAnchorPosition(anchor, { align: "end", width: POPOVER_WIDTH }));
    reposition();

    // Capture phase so scrolling any ancestor container moves the popover
    // with its trigger, not only a top-level page scroll.
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Stops here so a popover opened inside the side panel doesn't also
      // close the panel itself on a single Escape.
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    // `composedPath` rather than `event.target`: inside a shadow root (the
    // web-component build) the target is retargeted to the host element, so a
    // click on the popover would read as a click outside it.
    const onPointerDown = (event: Event) => {
      const path = event.composedPath?.() ?? [];
      if (path.includes(popoverRef.current!) || path.includes(triggerRef.current!)) return;
      setIsOpen(false);
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [isOpen]);

  if (parameters.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? popoverId : undefined}
        aria-label={`${parameters.length} query ${parameters.length === 1 ? "parameter" : "parameters"}`}
        className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-4 transition-colors ${
          isOpen
            ? "border-neutral-300 bg-neutral-200/70 text-foreground-secondary"
            : "border-border bg-neutral-100 text-foreground-muted hover:border-neutral-300 hover:text-foreground-secondary"
        }`}
      >
        <span aria-hidden>?{parameters.length}</span>
        <svg
          aria-hidden
          viewBox="0 0 10 10"
          className={`h-2 w-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1.5 3.5L5 7l3.5-3.5" />
        </svg>
      </button>

      {isOpen &&
        portalHost &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label="Query parameters"
            style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            className={`fixed z-[60] max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg ${
              coords.placement === "top" ? "-translate-y-full" : ""
            }`}
          >
            <p className="sticky top-0 border-b border-border bg-surface px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
              Query parameters
            </p>
            <ul className="divide-y divide-border">
              {parameters.map((parameter) => (
                <li key={parameter.name} className="px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <code className="font-mono text-xs font-semibold text-foreground">
                      {parameter.name}
                    </code>
                    {parameter.type && (
                      <span className="text-[10px] text-foreground-muted">{parameter.type}</span>
                    )}
                    {parameter.required && (
                      <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-red-600">
                        Required
                      </span>
                    )}
                  </div>
                  {parameter.description && (
                    <p className="mt-1 text-xs leading-snug text-foreground-secondary">
                      {parameter.description}
                    </p>
                  )}
                  {parameter.default && (
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      <span className="font-medium">Default:</span> <code>{parameter.default}</code>
                    </p>
                  )}
                  {parameter.enum && parameter.enum.length > 0 && (
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      {formatEnumDescription(parameter.enum)}
                    </p>
                  )}
                  {parameter.examples && parameter.examples.length > 0 && (
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      <span className="font-medium">Examples:</span> {parameter.examples.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>,
          portalHost,
        )}
    </>
  );
}
