import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chunkColors } from "../contants";
import { useAsyncAPIDocument } from "../contexts";
import formatEnumDescription from "../helpers/formatEnumDescription";
import { computeAnchorPosition, type AnchorPosition } from "../utils/anchorLayer";

// Structurally compatible with AsyncAPI's own Parameter type (a superset of
// this) as well as an OpenAPI parameter's schema fields, so both specs can
// pass their own parameter data here without casting.
export interface ChannelAddressParameterDetail {
  description?: string;
  type?: string;
  default?: string;
  enum?: string[];
  examples?: string[];
}

type AddressPart = { type: "text"; value: string } | { type: "param"; value: string };

function parseAddress(address: string): AddressPart[] {
  const parts: AddressPart[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(address)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: address.slice(lastIndex, match.index) });
    }
    parts.push({ type: "param", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < address.length) {
    parts.push({ type: "text", value: address.slice(lastIndex) });
  }
  return parts;
}

/** Matches the peek popover's inline width, so `end` alignment can keep it on-screen before it renders. */
const FULL_ADDRESS_WIDTH = 360;

/**
 * The address's colored chunks without any of the interactivity — for the
 * full-address peek, which is a read-only view of what the ellipsis clipped.
 * The live chunks each carry their own tooltip handlers, which would be
 * unreachable inside a `pointer-events-none` layer.
 */
function plainAddressChunks(parts: AddressPart[]) {
  let colorIndex = 0;
  return parts.map((part, i) =>
    part.type === "text" ? (
      <span key={i}>{part.value}</span>
    ) : (
      <span key={i} className={`font-semibold ${chunkColors[colorIndex++ % chunkColors.length]}`}>
        {`{${part.value}}`}
      </span>
    ),
  );
}

interface ChannelAddressProps {
  address: string;
  parameters?: Record<string, ChannelAddressParameterDetail>;
  className?: string;
  /** Clip to a single line with an ellipsis instead of wrapping. Useful in fixed-width contexts like table rows. */
  truncate?: boolean;
  /**
   * Make a clipped address's ellipsis hoverable/focusable, peeking the whole
   * thing wrapped. Off by default because most truncating callers already sit
   * inside something clickable — a table row, a nav item — where this would
   * nest an interactive element in another and add a tab stop per row. Opt in
   * where the address is the end of the line, i.e. a detail panel's header.
   */
  peek?: boolean;
  /**
   * Whether to keep its own `px-2 py-1`. Off for callers that sit in an
   * already-padded row, such as the navigation list. This has to be a prop
   * rather than a `p-0` in `className`: Tailwind emits `.px-2`/`.py-1` after
   * `.p-0`, so at equal specificity the padding wins on source order and the
   * override silently does nothing.
   */
  padded?: boolean;
}

export function ChannelAddress({ address, parameters, className = "text-xs", truncate = false, peek = false, padded = true }: ChannelAddressProps) {
  const { portalHost } = useAsyncAPIDocument();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [coords, setCoords] = useState<AnchorPosition>({ top: 0, left: 0, placement: "top" });
  const [isTruncated, setIsTruncated] = useState(false);
  // The full-address peek behind the ellipsis. Its own state rather than
  // another `hoveredIndex` slot: it anchors to the ellipsis instead of a
  // parameter chunk, and aligns to that edge rather than centering.
  const [fullCoords, setFullCoords] = useState<AnchorPosition | null>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const fullAddressId = useId();
  const parts = parseAddress(address);
  let colorIndex = 0;

  useEffect(() => {
    if (!truncate) return;
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [truncate, address]);

  const showTooltip = (i: number, anchor: HTMLElement) => {
    setCoords(computeAnchorPosition(anchor));
    setHoveredIndex(i);
  };

  const hideTooltip = () => setHoveredIndex(null);

  const showFullAddress = (anchor: HTMLElement) =>
    setFullCoords(computeAnchorPosition(anchor, { align: "end", width: FULL_ADDRESS_WIDTH }));

  const hideFullAddress = () => setFullCoords(null);

  const content = parts.map((part, i) => {
    if (part.type === "text") return <span key={i}>{part.value}</span>;
    const parameter = parameters?.[part.value];
    const color = chunkColors[colorIndex++ % chunkColors.length];
    const isHovered = hoveredIndex === i;
    const hasDetails =
      !!parameter &&
      (parameter.description || parameter.type || parameter.default || (parameter.enum && parameter.enum.length > 0) ||
        (parameter.examples && parameter.examples.length > 0));
    const tooltipId = `channel-address-tooltip-${i}`;
    const describedBy = hasDetails && isHovered ? tooltipId : undefined;

    return (
      <span
        key={i}
        className="inline-block"
        onMouseEnter={(e) => hasDetails && showTooltip(i, e.currentTarget)}
        onMouseLeave={hideTooltip}
      >
        <span
          className={`font-semibold ${color} ${hasDetails ? "cursor-help underline decoration-dotted" : ""}`}
          role={hasDetails ? "button" : undefined}
          tabIndex={hasDetails ? 0 : undefined}
          aria-expanded={hasDetails ? isHovered : undefined}
          aria-describedby={describedBy}
          onFocus={(e) => hasDetails && showTooltip(i, e.currentTarget)}
          onBlur={hideTooltip}
          onKeyDown={(event) => {
            if (!hasDetails) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              showTooltip(i, event.currentTarget);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              hideTooltip();
              event.currentTarget.blur();
            }
          }}
        >
          {`{${part.value}}`}
        </span>
        {hasDetails && isHovered && portalHost &&
          createPortal(
            <div
              id={tooltipId}
              className={`fixed -translate-x-1/2 max-w-xs px-2.5 py-1.5 bg-neutral-50 text-foreground-muted text-xs rounded pointer-events-none z-[60] shadow-lg text-left leading-snug ${
                coords.placement === "top" ? "-translate-y-full" : ""
              }`}
              style={{ top: coords.top, left: coords.left }}
            >
              {parameter.description && <div>{parameter.description}</div>}
              {parameter.type && (
                <div className="mt-1">
                  <code>{parameter.type}</code>
                </div>
              )}
              {parameter.default && (
                <div className="mt-1">
                  <span className="font-semibold text-foreground-secondary">Default:</span>{" "}
                  <code>{parameter.default}</code>
                </div>
              )}
              {parameter.enum && parameter.enum.length > 0 && (
                <div className="mt-1">{formatEnumDescription(parameter.enum)}</div>
              )}
              {parameter.examples && parameter.examples.length > 0 && (
                <div className="mt-1">
                  <span className="font-semibold text-foreground-secondary">Examples:</span>{" "}
                  {parameter.examples.join(", ")}
                </div>
              )}
            </div>,
            portalHost
          )}
      </span>
    );
  });

  const padding = padded ? "px-2 py-1 " : "";

  if (!truncate) {
    return (
      <code className={`${padding}rounded text-foreground-secondary break-all ${className}`}>
        {content}
      </code>
    );
  }

  return (
    <code className={`${padding}rounded text-foreground-secondary flex items-center min-w-0 ${className}`}>
      <span ref={contentRef} className="overflow-hidden whitespace-nowrap min-w-0">
        {content}
      </span>
      {/* The ellipsis is the affordance for what got clipped, so where it's
          allowed to be interactive it's also the thing that reveals it.
          Either way it only appears when something is actually hidden, so it
          stays silent on addresses that fit. */}
      {isTruncated &&
        (peek ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Show full address"
            aria-expanded={!!fullCoords}
            aria-describedby={fullCoords ? fullAddressId : undefined}
            className="shrink-0 cursor-help px-0.5 text-foreground-muted hover:text-foreground-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 rounded"
            onMouseEnter={(event) => showFullAddress(event.currentTarget)}
            onMouseLeave={hideFullAddress}
            onFocus={(event) => showFullAddress(event.currentTarget)}
            onBlur={hideFullAddress}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                // Stops here so activating the peek inside a clickable row
                // doesn't also trigger the row itself.
                event.preventDefault();
                event.stopPropagation();
                showFullAddress(event.currentTarget);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                hideFullAddress();
                event.currentTarget.blur();
              }
            }}
          >
            …
          </span>
        ) : (
          <span aria-hidden className="shrink-0">
            …
          </span>
        ))}
      {/* Gated on `isTruncated` too: a resize can widen the address back to
          fitting while the peek is up, unmounting the ellipsis it points at. */}
      {peek &&
        isTruncated &&
        fullCoords &&
        portalHost &&
        createPortal(
          <div
            id={fullAddressId}
            role="tooltip"
            style={{ top: fullCoords.top, left: fullCoords.left, width: FULL_ADDRESS_WIDTH }}
            className={`fixed z-[60] rounded-lg border border-border bg-surface px-3 py-2 shadow-lg pointer-events-none ${
              fullCoords.placement === "top" ? "-translate-y-full" : ""
            }`}
          >
            {/* Plain chunks, not `content`: those carry their own tooltip
                handlers, and a tooltip nested inside a pointer-events-none
                layer could never be reached anyway. */}
            <code className="block break-all font-mono text-xs leading-relaxed text-foreground-secondary">
              {plainAddressChunks(parts)}
            </code>
          </div>,
          portalHost,
        )}
    </code>
  );
}
