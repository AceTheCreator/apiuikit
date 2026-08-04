import { useEffect, useRef, useState } from "react";
import IconClipboard from "../icons/Clipboard";
import IconCheck from "../icons/Check";

interface CopyMarkdownButtonProps {
  /** Builds the Markdown string to copy. Called lazily, only on click. */
  getMarkdown: () => string;
  /** Used as both the button's `title` and `aria-label`. */
  label: string;
}

/**
 * Small inline icon button that copies `getMarkdown()`'s result to the
 * clipboard, showing a transient checkmark on success. Unlike
 * MarkdownExportMenu (a floating, viewport-pinned button with its own
 * dropdown menu), this is meant to sit inline in normal document flow —
 * e.g. a SidePanel header — so it has no positioning or portal logic.
 */
export default function CopyMarkdownButton({ getMarkdown, label }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[CopyMarkdownButton] copy failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      aria-label={label}
      className="ml-2 p-1 rounded hover:bg-neutral-100 text-foreground-muted hover:text-foreground-secondary transition-colors"
    >
      {copied ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconClipboard className="w-4 h-4" />}
    </button>
  );
}
