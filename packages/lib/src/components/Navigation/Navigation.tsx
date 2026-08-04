import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAsyncAPIDocument } from "../../contexts";
import { useElementRect } from "../../utils/useElementRect";
import { allocateSpineTicks, spineTickBudget } from "./spineTicks";

export interface NavItemState {
  isSelected: boolean;
  isSectionActive: boolean;
}

export interface NavSectionDescriptor<T> {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: T[];
  itemKey: (item: T) => string;
  /** DOM id to scroll into view when this item is chosen, e.g. `operation-${key}`. */
  targetId: (item: T) => string;
  /** False for sections with no switchable tab of their own (e.g. Servers, which is always on screen) — only their items support scroll-to-select. Defaults to true. */
  isTab?: boolean;
  /** False to keep a section out of the expanded popover list while still tracking it for the spine's ticks and scroll-spy (e.g. Info: worth a tick, not worth a whole popover entry). Defaults to true. */
  showInPopover?: boolean;
  /** Content rendered for the item — just the badge/label, no button/list chrome, which this component owns so styling stays consistent across specs. */
  renderItem: (item: T, state: NavItemState) => ReactNode;
}

/** A section whose item type has been erased, so sections with different item shapes (a server URL, a `FlatEndpoint`, a plain schema name, ...) can sit in one array. Build one from a concrete `NavSectionDescriptor<T>` via `defineNavSection`. */
export type ErasedNavSection = NavSectionDescriptor<unknown>;

/**
 * The single cast that erases a section's item type. Safe because
 * `Navigation` only ever feeds a section's own `items` back into that
 * same section's `itemKey`/`targetId`/`renderItem` — it never mixes items
 * across sections — so the erased `unknown` is always the original `T` by
 * construction, even though the type system can't see that through the array.
 */
export function defineNavSection<T>(section: NavSectionDescriptor<T>): ErasedNavSection {
  return section as unknown as ErasedNavSection;
}

interface NavigationProps {
  sections: ErasedNavSection[];
  activeSection: string | null;
  onTabChange: (sectionId: string) => void;
  onItemSelect: (sectionId: string, key: string) => void;
  selectedItem?: { section: string; key: string } | null;
}

// Both the spine and the popover anchor to this same offset — the popover
// appears exactly where the ticks are (not beside them), so hovering the
// ticks lands the cursor on the popover with no gap to cross.
const NAV_LEFT_OFFSET = 20;

/**
 * The sidebar navigation shared by AsyncAPI and OpenAPI, styled after Medium's
 * table-of-contents. On wide layouts a bare tick "spine" (a parent tick per
 * section plus a child tick per item, scroll-spy highlighted) sits fixed in
 * the left gutter at the viewport's vertical center; hovering or clicking it
 * opens a floating popover of sections (icon + label + count) with their
 * items indented beneath. On narrow layouts (no gutter) the trigger is a
 * floating bottom-right button that opens the same popover on click.
 * Each spec supplies its own data as section descriptors (see
 * `NavSectionDescriptor`) via a thin adapter — `AsyncAPINavigation` /
 * `OpenAPINavigation`, both in this same directory — so spec-specific
 * concerns (channel addresses, action badges, method badges, ...) stay in the
 * adapter while the mechanics below are written once.
 */
export default function Navigation({
  sections,
  activeSection,
  onTabChange,
  onItemSelect,
  selectedItem,
}: NavigationProps) {
  // `open` persists until explicitly closed (click, outside click, Escape) —
  // `hovering` is a transient overlay on top of it: hovering the spine (or,
  // once open, the popover itself) shows it without pinning it open, so
  // moving the mouse away closes it again unless it was also opened via click.
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const isVisible = open || hovering;
  const { rootElement, portalHost } = useAsyncAPIDocument();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const visibleSections = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections],
  );

  // Only a tab section's own tab is ever mounted at once (e.g. Operations OR
  // Messages, never both) — a non-tab section like Servers is always mounted
  // alongside whichever tab is current. So the spine (which represents "what's
  // actually on the page to scroll through") should only tick sections that
  // are really there, unlike the popover below, which lists every section on
  // purpose so it can jump you into a tab that isn't showing yet.
  const spineSections = useMemo(
    () => visibleSections.filter((section) => section.isTab === false || section.id === activeSection),
    [visibleSections, activeSection],
  );

  // Info is worth a tick (and scroll-spy tracking) but not a whole popover
  // entry — there's nothing to expand into beyond "scroll to the top".
  const popoverSections = useMemo(
    () => visibleSections.filter((section) => section.showInPopover !== false),
    [visibleSections],
  );

  // Which item is actually scrolled into view right now, tracked independently
  // of the click-driven `activeSection`/`selectedItem` props — those only
  // reflect the last thing explicitly clicked (or nothing, before any click),
  // so without this the ticks would never move as the user free-scrolls.
  const [scrollActive, setScrollActive] = useState<{ section: string; key: string } | null>(null);

  // A just-clicked target, held until the observer genuinely confirms it (or
  // a timeout passes). `scrollIntoView({ behavior: "smooth" })` animates over
  // ~300ms+, and the observer keeps firing throughout that animation — with
  // the *previous* section still winning until the new one actually settles
  // into the band — so without this, an optimistic `setScrollActive` from a
  // click gets clobbered by the observer's next (stale) callback almost
  // immediately, before the scroll even finishes.
  const pendingClickRef = useRef<{ section: string; key: string } | null>(null);
  const clearPendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectExplicitly = useCallback((section: string, key: string) => {
    setScrollActive({ section, key });
    pendingClickRef.current = { section, key };
    if (clearPendingTimeoutRef.current) clearTimeout(clearPendingTimeoutRef.current);
    clearPendingTimeoutRef.current = setTimeout(() => {
      pendingClickRef.current = null;
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (clearPendingTimeoutRef.current) clearTimeout(clearPendingTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const candidates = sections
      .filter((section) => section.items.length > 0)
      .flatMap((section) =>
        section.items.map((item) => ({
          section: section.id,
          key: section.itemKey(item),
          id: section.targetId(item),
        })),
      );

    const tracked = candidates
      .map((c) => ({ ...c, el: document.getElementById(c.id) }))
      .filter((c): c is typeof c & { el: HTMLElement } => !!c.el);

    if (tracked.length === 0) return;

    const elementToCandidate = new Map(tracked.map((c) => [c.el, c]));

    // Only elements crossing a band near the top of the viewport count as
    // "in view" — the standard scrollspy trick. Kept as a running set (rather
    // than only looking at the entries in one callback batch, which only
    // reports elements whose state just *changed*) so the decision always
    // reflects everything currently in the band, not just what toggled most
    // recently. Among those, the lowest one (largest `top`) wins — that's
    // whichever section the user has scrolled to most recently, not whichever
    // has simply been on screen longest.
    const currentlyIntersecting = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) currentlyIntersecting.set(entry.target, entry.boundingClientRect.top);
          else currentlyIntersecting.delete(entry.target);
        }

        if (currentlyIntersecting.size === 0) return;

        let winner: Element | null = null;
        let winnerTop = -Infinity;
        for (const [el, top] of currentlyIntersecting) {
          if (top > winnerTop) {
            winner = el;
            winnerTop = top;
          }
        }

        const match = winner && elementToCandidate.get(winner as HTMLElement);
        if (!match) return;

        const pending = pendingClickRef.current;
        if (pending) {
          // Ignore stale winners while a click's scroll animation is still
          // in flight — only the clicked target itself is allowed to confirm
          // (and thus release) the pending state early.
          if (match.section !== pending.section || match.key !== pending.key) return;
          pendingClickRef.current = null;
        }

        setScrollActive({ section: match.section, key: match.key });
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 },
    );

    tracked.forEach((c) => observer.observe(c.el));
    return () => observer.disconnect();
  }, [sections]);

  // Once the observer has reported anything, it wins — it reflects the user's
  // actual scroll position, which is a better answer than "whatever was last
  // clicked" (or nothing, before any click at all).
  const effectiveActiveSection = scrollActive?.section ?? activeSection;
  const effectiveSelectedItem = scrollActive ?? selectedItem;

  // Fixed to the viewport, vertically centered, like Medium's table-of-contents
  // rail — not pinned to the widget's top edge the way the old icon toggle was.
  // Tracked continuously (not gated on visibility) so it can follow both the
  // widget's horizontal position and whether the widget is in view at all.
  const rootRect = useElementRect(rootElement, true);

  // Guarded so server-side rendering the component doesn't touch `window`;
  // the rect is null there anyway, so everything below degrades to hidden.
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const widgetInView = !!rootRect && rootRect.bottom > 0 && rootRect.top < viewportHeight;

  // The spine lives in the left gutter that Section's centered content leaves
  // on wide layouts. Below this width there is no gutter (content runs edge
  // to edge), so the ticks would sit on top of the text — swap the trigger
  // for a floating bottom-right button instead. The popover itself is the
  // same in both modes; only what summons it differs (hover the ticks vs.
  // click the button). Measured on the widget, not the viewport, so a narrow
  // embed on a wide screen gets the compact trigger too.
  const isCompact = !!rootRect && rootRect.width < 1024;

  const visibilityStyle: React.CSSProperties = {
    opacity: widgetInView ? 1 : 0,
    pointerEvents: widgetInView ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  const spineStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: (rootRect?.left ?? 0) + NAV_LEFT_OFFSET,
    transform: "translateY(-50%)",
    zIndex: 51,
    ...visibilityStyle,
  };

  // Hug the widget's right edge (clamped to the viewport for embeds wider
  // than the screen), where a thumb naturally rests.
  const compactToggleLeft = Math.min(rootRect?.right ?? 0, viewportWidth) - 60;
  const compactToggleStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 16,
    left: compactToggleLeft,
    zIndex: 51,
    ...visibilityStyle,
  };

  // Deliberately not spreading `visibilityStyle` here: the popover's own
  // visibility is driven by `isVisible` (open/hover state) via the Tailwind
  // classes below, not by whether the widget happens to be on screen. Gating
  // it on `widgetInView` too would make it hidden-by-default logic get
  // clobbered — inline `style` always wins over a class for the same
  // property, so an `opacity: 1` here would override `opacity-0`.
  // z-52: above both triggers (z-51) — on desktop it appears directly over
  // the ticks, so it must visually cover them once open.
  const popoverStyle: React.CSSProperties = isCompact
    ? {
        // Anchored just above the compact button, right edges aligned.
        position: "fixed",
        bottom: 16 + 44 + 8,
        right: viewportWidth - (compactToggleLeft + 44),
        zIndex: 52,
      }
    : {
        position: "fixed",
        top: "50%",
        left: (rootRect?.left ?? 0) + NAV_LEFT_OFFSET,
        transform: "translateY(-50%)",
        zIndex: 52,
      };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toggleRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  // Sections with no tab of their own (e.g. Servers) have nothing to switch
  // into — only the scroll-to-item part of navigation applies to them.
  const navigate = useCallback(
    (section: NavSectionDescriptor<unknown>, targetId?: string) => {
      if (section.isTab !== false) onTabChange(section.id);
      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    },
    [onTabChange],
  );

  // The popover's list body. Memoized because `useElementRect` re-renders this
  // component on every scroll/resize frame just to reposition the fixed
  // chrome — reusing the exact same elements here lets React skip reconciling
  // this whole subtree (hundreds of buttons for a large document) on those
  // frames. It only rebuilds when the data or highlight state actually changes.
  const sectionList = useMemo(() => popoverSections.map((section) => {
    const isSectionActive = effectiveActiveSection === section.id;
    const hasSelectedItem = effectiveSelectedItem?.section === section.id;
    const Icon = section.icon;

    return (
      <div key={section.id} className="pb-1">
        <button
          onClick={() => {
            navigate(section);
            selectExplicitly(section.id, "");
            // Tapping a destination dismisses the popover in compact mode
            // (it covers the content there); the desktop popover stays put.
            if (isCompact) setOpen(false);
          }}
          className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
            isSectionActive ? "bg-primary-50" : "hover:bg-neutral-50"
          }`}
        >
          <Icon
            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
              isSectionActive
                ? "text-primary-500"
                : "text-foreground-muted group-hover:text-foreground-secondary"
            }`}
          />
          <span
            className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
              isSectionActive
                ? "text-primary-600"
                : "text-foreground-muted group-hover:text-foreground-secondary"
            }`}
          >
            {section.label}
          </span>
          <span
            className={`ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[10px] transition-colors ${
              isSectionActive
                ? "border border-primary-200 bg-primary-100 text-primary-500"
                : "bg-neutral-100 text-foreground-muted"
            }`}
          >
            {section.items.length}
          </span>
        </button>

        {section.items.length > 0 && (
          <ul className="ml-4 mt-0.5 border-l border-border pl-3">
            {section.items.map((item) => {
              const key = section.itemKey(item);
              const isSelected = hasSelectedItem && effectiveSelectedItem?.key === key;

              return (
                <li key={key}>
                  <button
                    onClick={() => {
                      navigate(section, section.targetId(item));
                      onItemSelect(section.id, key);
                      selectExplicitly(section.id, key);
                      if (isCompact) setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-0.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-primary-50 font-medium text-primary-500"
                        : isSectionActive
                        ? "text-foreground-secondary hover:bg-primary-50 hover:text-foreground"
                        : "text-foreground-muted hover:bg-neutral-50 hover:text-foreground-secondary"
                    }`}
                  >
                    {section.renderItem(item, { isSelected, isSectionActive })}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }), [popoverSections, effectiveActiveSection, effectiveSelectedItem, isCompact, navigate, onItemSelect, selectExplicitly]);

  // The spine is centered on the viewport, so a document with hundreds of
  // operations would run off both ends. Rather than clip it (which would hide
  // whichever end holds the active tick) the item ticks are downsampled to fit:
  // a shorter rail that still spans every section beats a full-length one whose
  // ends are off screen.
  const tickBudget = spineTickBudget(viewportHeight, spineSections.length);

  // Same reasoning as `sectionList`: keep the tick elements stable across the
  // scroll-driven repositioning re-renders.
  const spineTicks = useMemo(() => {
    const tickCounts = allocateSpineTicks(
      spineSections.map((section) => section.items.length),
      tickBudget,
    );

    return spineSections.map((section, sectionIndex) => {
      const isActive = effectiveActiveSection === section.id;
      const itemCount = section.items.length;
      const tickCount = tickCounts[sectionIndex];

      // Once downsampled, each tick stands for a contiguous run of items, so
      // the highlight lands on the run holding the active item rather than on
      // an item-for-tick match that no longer exists.
      let activeTick = -1;
      if (effectiveSelectedItem?.section === section.id) {
        const itemIndex = section.items.findIndex(
          (item) => section.itemKey(item) === effectiveSelectedItem.key,
        );
        if (itemIndex >= 0) {
          activeTick = Math.min(tickCount - 1, Math.floor((itemIndex * tickCount) / itemCount));
        }
      }

      return (
        <div key={section.id} className="flex flex-col items-start gap-1">
          <span
            className={`block h-[2px] rounded-full transition-all duration-150 ${
              isActive ? "w-6 bg-foreground-secondary" : "w-4 bg-neutral-300 group-hover:bg-neutral-400"
            }`}
          />
          <div className="flex flex-col items-start gap-1">
            {Array.from({ length: tickCount }, (_, tickIndex) => (
              <span
                key={tickIndex}
                className={`block h-[2px] w-3 rounded-full transition-colors duration-150 ${
                  tickIndex === activeTick ? "bg-neutral-500" : "bg-neutral-200 group-hover:bg-neutral-300"
                }`}
              />
            ))}
          </div>
        </div>
      );
    });
  }, [spineSections, effectiveActiveSection, effectiveSelectedItem, tickBudget]);

  return (
    <>
      {/* A bare table-of-contents "spine" (Medium-style): one tick per section,
          no background/border/icon, fixed to the viewport's vertical center. The
          active section's tick is longer and darker, and grows one smaller
          child tick per item, hinting at how big that section is. Purely a
          visual + hover-open trigger — clicking it opens the popover below,
          nothing new to jump to. */}
      {!isCompact && (
        <button
          ref={toggleRef}
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          title={isVisible ? "Close navigation" : "Open navigation"}
          aria-label={isVisible ? "Close navigation" : "Open navigation"}
          className="group flex flex-col items-start gap-3 p-2"
          style={spineStyle}
        >
          {spineTicks}
        </button>
      )}

      {/* Compact trigger: no gutter for the spine to live in, so a floating
          bottom-right button (echoing the tick motif) opens the very same
          popover on click — hover doesn't exist on touch. */}
      {isCompact && (
        <button
          ref={toggleRef}
          onClick={() => setOpen((v) => !v)}
          title={open ? "Close navigation" : "Open navigation"}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background shadow-lg"
          style={compactToggleStyle}
        >
          <span className="flex flex-col items-start gap-1">
            <span className="block h-[2px] w-4 rounded-full bg-foreground-secondary" />
            <span className="block h-[2px] w-3 rounded-full bg-neutral-400" />
            <span className="block h-[2px] w-3 rounded-full bg-neutral-300" />
          </span>
        </button>
      )}

      {portalHost &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={`max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-xl transition-all duration-150 ${
              isCompact ? "origin-bottom-right" : ""
            } ${
              isVisible ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            }`}
            style={popoverStyle}
          >
            {sectionList}
          </div>,
          portalHost,
        )}
    </>
  );
}
