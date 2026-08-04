import { useEffect, useRef, useState } from "react";
import IconCopy from "../icons/Copy";

interface CopyButtonProps {
  text: string;
  ariaLabel?: string;
}

export function CopyButton({ text, ariaLabel = "Copy to clipboard" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the button as-is.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : ariaLabel}
      title={copied ? "Copied" : ariaLabel}
      className="absolute top-1.5 right-1.5 p-1.5 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-200/60 transition-colors"
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-green-600"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 8.5l3.5 3.5 7.5-8" />
        </svg>
      ) : (
        <IconCopy className="w-4 h-4" />
      )}
    </button>
  );
}
