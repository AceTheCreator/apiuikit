import { getDepthColor } from "./depthColors";
import { useAsyncAPIDocument } from "../../contexts";

interface ExpandToggleProps {
  depth: number;
  expanded: boolean;
  onToggle: () => void;
}

/** Circular +/- toggle with optional "Show details" label when collapsed. */
export default function ExpandToggle({ depth, expanded, onToggle }: ExpandToggleProps) {
  const { depthColors } = useAsyncAPIDocument();
  const color = getDepthColor(depth, depthColors);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? "Hide details" : undefined}
      className="cursor-pointer mt-1 flex items-center gap-1.5 shrink-0 text-left hover:opacity-80"
    >
      <span
        aria-hidden="true"
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] leading-none font-bold hover:bg-neutral-100"
        style={{ borderColor: color, color }}
      >
        {expanded ? "−" : "+"}
      </span>
      {!expanded && (
        <span className="text-xs text-foreground-muted">Show details</span>
      )}
    </button>
  );
}
