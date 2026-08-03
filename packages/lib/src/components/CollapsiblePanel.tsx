import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import IconArrowRight from "../icons/ArrowRight";
import IconDownRight from "../icons/ArrowDown";

interface CollapsiblePanelProps {
  /** Header content before the chevron — e.g. a count pill or a protocol badge. */
  trigger: ReactNode;
  /** Content revealed inside the animated panel. */
  children: ReactNode;
  /** Starts expanded. Defaults to false. */
  defaultExpanded?: boolean;
  /** Forces the panel open once true (e.g. search navigated here) — never forces it closed, so a later `false` doesn't collapse something the user opened themselves. */
  forceExpanded?: boolean;
  /** Id of an external heading that labels the toggle button (e.g. an `<h3>` above it), when there is one. */
  ariaLabelledBy?: string;
  /** Extra classes on the outer bordered container. */
  className?: string;
}

/**
 * The expand/collapse accordion pattern shared by Authorization sections
 * (Server, Operation) and Bindings: a toggle button with a `trigger` badge
 * and chevron, and a `grid-rows-[0fr]/[1fr]` animated panel beneath it. Owns
 * the ARIA wiring (`aria-expanded`/`aria-controls`) and the "force open on
 * search navigation" glue that was duplicated identically across all three.
 */
export default function CollapsiblePanel({
  trigger,
  children,
  defaultExpanded = false,
  forceExpanded = false,
  ariaLabelledBy,
  className = "",
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  return (
    <div className={`rounded-lg border border-border overflow-hidden ${className}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-labelledby={ariaLabelledBy}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 bg-neutral-50 text-left hover:bg-neutral-100 transition-colors"
      >
        {trigger}
        {expanded ? (
          <IconDownRight className="w-4 h-4 text-foreground-muted shrink-0" />
        ) : (
          <IconArrowRight className="w-4 h-4 text-foreground-muted shrink-0" />
        )}
      </button>
      <div
        id={panelId}
        className={`grid transition-all duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
