import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chunkColors } from "../contants";
import { useAsyncAPIDocument } from "../contexts";
import formatEnumDescription from "../helpers/formatEnumDescription";

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

interface ChannelAddressProps {
  address: string;
  parameters?: Record<string, ChannelAddressParameterDetail>;
  className?: string;
  /** Clip to a single line with an ellipsis instead of wrapping. Useful in fixed-width contexts like table rows. */
  truncate?: boolean;
}

export function ChannelAddress({ address, parameters, className = "text-xs", truncate = false }: ChannelAddressProps) {
  const { portalHost } = useAsyncAPIDocument();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "top" as "top" | "bottom" });
  const [isTruncated, setIsTruncated] = useState(false);
  const contentRef = useRef<HTMLSpanElement>(null);
  const parts = parseAddress(address);
  let colorIndex = 0;

  const TOOLTIP_CLEARANCE = 40;

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
    const rect = anchor.getBoundingClientRect();
    const placement = rect.top < TOOLTIP_CLEARANCE ? "bottom" : "top";
    setCoords({
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      placement,
    });
    setHoveredIndex(i);
  };

  const hideTooltip = () => setHoveredIndex(null);

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

  if (!truncate) {
    return (
      <code className={`px-2 py-1 rounded text-foreground-secondary break-all ${className}`}>
        {content}
      </code>
    );
  }

  return (
    <code className={`px-2 py-1 rounded text-foreground-secondary flex items-center min-w-0 ${className}`}>
      <span ref={contentRef} className="overflow-hidden whitespace-nowrap min-w-0">
        {content}
      </span>
      {isTruncated && <span aria-hidden className="shrink-0">...</span>}
    </code>
  );
}
