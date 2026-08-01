import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconClipboard from "../icons/Clipboard";
import IconCheck from "../icons/Check";
import IconExternalLink from "../icons/ExternalLink";
import { useAsyncAPIDocument } from "../contexts";
import { useAutoHideOnScroll } from "../utils/useAutoHideOnScroll";
import { useElementRect } from "../utils/useElementRect";

interface MarkdownExportMenuProps {
  /** Builds the Markdown string for the whole document, given `deref` (from
   * this component's own document context — Layout renders this as a *child*
   * of the provider, so it can't read context itself). Called lazily, only
   * when a menu item is clicked — serialization isn't free for large
   * documents, so it shouldn't run on every render/open. */
  serialize: (deref: (ref: string) => unknown) => string;
  /** Left offset (px) for this floating button, continuing the sidebar (12px)
   * / search (60px) toggle-button offset sequence — see index.css. */
  leftOffset: number;
}

export default function MarkdownExportMenu({ serialize, leftOffset }: MarkdownExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { portalHost, rootElement, deref } = useAsyncAPIDocument();
  const getMarkdown = () => serialize(deref);

  const toggleMode = useAutoHideOnScroll(rootElement, isOpen);
  const isPinnedToViewport = toggleMode !== "docked";
  const rootRect = useElementRect(rootElement, isPinnedToViewport);

  const toggleStyle: React.CSSProperties = {
    left: isPinnedToViewport ? (rootRect?.left ?? 0) + leftOffset : leftOffset,
    transform: `translateY(${toggleMode === "hidden" ? "-150%" : "0px"})`,
    zIndex: 40,
    ...(isPinnedToViewport
      ? {
          position: "fixed",
          top: 10,
          pointerEvents: toggleMode === "hidden" ? "none" : undefined,
        }
      : {}),
  };

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const handleCopy = async () => {
    const markdown = getMarkdown();
    console.log("[MarkdownExportMenu] Copy for LLM clicked", {
      markdownLength: markdown.length,
      hasClipboardApi: !!navigator.clipboard,
      isSecureContext: window.isSecureContext,
    });
    try {
      if (!navigator.clipboard) {
        throw new Error("navigator.clipboard is unavailable (requires a secure context: https or localhost)");
      }
      await navigator.clipboard.writeText(markdown);
      console.log("[MarkdownExportMenu] clipboard.writeText succeeded");
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[MarkdownExportMenu] Copy for LLM failed:", err);
    }
    setIsOpen(false);
  };

  const handleViewAsMarkdown = () => {
    const markdown = getMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    console.log("[MarkdownExportMenu] View as Markdown clicked", {
      markdownLength: markdown.length,
      blobUrl: url,
    });
    const newTab = window.open(url, "_blank");
    if (!newTab) {
      console.error(
        "[MarkdownExportMenu] window.open returned null — the popup was likely blocked by the browser's popup blocker.",
      );
    }
    // Long enough for the new tab to finish loading the blob; it isn't
    // reusable across reloads anyway, so no need to hold onto it longer.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title="Copy as Markdown"
        aria-label="Copy as Markdown"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="panel-toggle-btn bg-neutral-100"
        style={toggleStyle}
      >
        {copied ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconClipboard className="w-4 h-4" />}
      </button>

      {isOpen &&
        portalHost &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: isPinnedToViewport ? "fixed" : "absolute",
              top: isPinnedToViewport ? 54 : 54,
              left: toggleStyle.left,
              zIndex: 41,
            }}
            className="w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleCopy}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-neutral-100"
            >
              <span className="text-sm font-medium text-foreground">
                {copied ? "Copied!" : "Copy for LLM"}
              </span>
              <span className="text-xs text-foreground-muted">Copy page as Markdown</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleViewAsMarkdown}
              className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-100 border-t border-border"
            >
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium text-foreground">View as Markdown</span>
                <span className="text-xs text-foreground-muted">Open this page as Markdown</span>
              </span>
              <IconExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground-muted" />
            </button>
          </div>,
          portalHost,
        )}
    </>
  );
}
