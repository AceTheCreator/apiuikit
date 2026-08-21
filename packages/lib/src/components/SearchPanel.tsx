import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { SearchEntry } from "../helpers/searchIndex";
import SearchIcon from "../icons/Search";
import { useAsyncAPIDocument } from "../contexts";
import { getScrollLockTarget, lockScroll } from "../utils/scrollLock";

interface SearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: SearchEntry[];
  onSelectResult: (entry: SearchEntry) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function SearchPanel({
  query,
  onQueryChange,
  results,
  onSelectResult,
  onOpenChange,
}: SearchPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const resultsId = "asyncapi-search-results";
  const resultItemId = (index: number) => `asyncapi-search-result-${index}`;
  const { portalHost, rootElement, topOffset = 0 } = useAsyncAPIDocument();

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    onOpenChange?.(isModalOpen);
    return () => onOpenChange?.(false);
  }, [isModalOpen, onOpenChange]);

  // "The widget is in focus" can't rely on document.activeElement alone —
  // most of the rendered content (headings, table rows, schema trees) isn't
  // a focusable element, so clicking around the widget would never move
  // real DOM focus into it. Instead, track the two things that actually
  // signal "the user is engaged with this widget": the mouse currently
  // hovering it, or the most recent mousedown having landed inside it. Real
  // keyboard focus (e.g. an input inside gaining focus) still counts too.
  const isHoveredRef = useRef(false);
  const lastPointerDownInsideRef = useRef(false);

  useEffect(() => {
    if (!rootElement) return;
    const handleEnter = () => {
      isHoveredRef.current = true;
    };
    const handleLeave = () => {
      isHoveredRef.current = false;
    };
    rootElement.addEventListener("mouseenter", handleEnter);
    rootElement.addEventListener("mouseleave", handleLeave);
    return () => {
      rootElement.removeEventListener("mouseenter", handleEnter);
      rootElement.removeEventListener("mouseleave", handleLeave);
    };
  }, [rootElement]);

  useEffect(() => {
    if (!rootElement) return;
    const handlePointerDown = (event: MouseEvent) => {
      lastPointerDownInsideRef.current = rootElement.contains(event.target as Node);
    };
    document.addEventListener("mousedown", handlePointerDown, true);
    return () => document.removeEventListener("mousedown", handlePointerDown, true);
  }, [rootElement]);

  // Ctrl+K / Cmd+K opens search — but only while the widget is in focus, per
  // the three signals tracked above. Attached to `document` (not rootElement)
  // since the hover/last-click signals need to work even when nothing inside
  // the widget holds real keyboard focus.
  useEffect(() => {
    if (!rootElement) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      const isModKey = event.metaKey || event.ctrlKey;
      if (!isModKey || event.key.toLowerCase() !== "k") return;
      const isWidgetInFocus =
        rootElement.contains(document.activeElement) ||
        isHoveredRef.current ||
        lastPointerDownInsideRef.current;
      if (!isWidgetInFocus) return;
      event.preventDefault();
      setIsModalOpen(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [rootElement]);

  useEffect(() => {
    if (!isModalOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen || !portalHost) return;
    return lockScroll(getScrollLockTarget(portalHost));
  }, [isModalOpen, portalHost]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isModalOpen]);

  // Closes on any click outside the modal card (mousedown, so it fires
  // before a result button's own click handler).
  useEffect(() => {
    if (!isModalOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isModalOpen]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(results.length - 1);
    }
  }, [activeIndex, results.length]);

  // Keeps the highlighted result in view as arrow keys move past the edge of
  // the scrollable listbox — otherwise the active row can move behind the
  // fold with nothing on screen to show it changed.
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(resultItemId(activeIndex))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const showDropdown = isModalOpen && query.trim().length > 0;

  const handleSelectResult = (result: SearchEntry) => {
    closeModal();
    onSelectResult(result);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0 ? -1 : Math.min(current + 1, results.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0 ? -1 : Math.max(current - 1, 0)
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (results.length > 0) setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      if (results.length > 0) setActiveIndex(results.length - 1);
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      activeIndex >= 0 &&
      results[activeIndex]
    ) {
      event.preventDefault();
      handleSelectResult(results[activeIndex]);
      return;
    }
  };

  const resultCountText = showDropdown
    ? `${results.length} result${results.length === 1 ? "" : "s"} found`
    : "";
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title="Search"
        aria-label="Search"
        className="panel-toggle-btn bg-neutral-100"
      >
        <SearchIcon />
      </button>

      {isModalOpen &&
        portalHost &&
        createPortal(
          // z-[60] — above this search toggle, the nav spine (z-51), and the
          // nav popover (z-52), so the backdrop dims them along with the rest
          // of the page instead of leaving them floating on top of it.
          <div
            className="fixed inset-0 z-[60] flex justify-center px-4 pt-24"
            style={{ top: topOffset }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div
              ref={modalRef}
              // An arbitrary max-width (not e.g. `max-w-lg`) — this project's
              // tailwind config repoints the sm/md/lg/xl max-w-* scale to
              // match its @container query breakpoints (up to 80rem), so
              // those utilities would render far wider than intended here.
              className="relative h-fit w-full max-w-[36rem] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
            >
              <div className="p-4">
                <input
                  ref={inputRef}
                  id="asyncapi-search"
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search document..."
                  aria-label="Search document"
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-expanded={showDropdown}
                  aria-controls={resultsId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    activeIndex >= 0 ? resultItemId(activeIndex) : undefined
                  }
                  className="w-full rounded-md bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
                />
              </div>
              <div aria-live="polite" className="sr-only">
                {resultCountText}
              </div>
              {showDropdown && (
                <div
                  id={resultsId}
                  role="listbox"
                  className="max-h-80 overflow-y-auto"
                >
                  {results.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {results.map((result, index) => (
                        <li key={result.id}>
                          <button
                            id={resultItemId(index)}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === index}
                            onClick={() => handleSelectResult(result)}
                            className={
                              "w-full text-left px-4 py-3 hover:bg-neutral-50 " +
                              (activeIndex === index ? "bg-neutral-100" : "")
                            }
                          >
                            <div className="text-sm font-semibold text-foreground">
                              {result.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                              <span>{result.location}</span>
                              {result.subtitle && (
                                <span>• {result.subtitle}</span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-4 text-sm text-foreground-muted">
                      No results found.
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-1.5 text-xs text-foreground-muted">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-neutral-50 px-1 font-mono text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-border bg-neutral-50 px-1 font-mono text-[10px]">
                    ↓
                  </kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-neutral-50 px-1 font-mono text-[10px]">
                    ↵
                  </kbd>
                  to select
                </span>
                <span className="flex items-center gap-1">
                  Press
                  <kbd className="rounded border border-border bg-neutral-50 px-1 font-mono text-[10px]">
                    {isMac ? "⌘ Cmd" : "Ctrl"}
                  </kbd>
                  <kbd className="rounded border border-border bg-neutral-50 px-1 font-mono text-[10px]">
                    K
                  </kbd>
                  to search
                </span>
              </div>
            </div>
          </div>,
          portalHost,
        )}
    </>
  );
}
