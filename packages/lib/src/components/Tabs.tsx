import { useId, useRef } from "react";
import type { ComponentType, ReactNode } from "react";
import type { KeyboardEvent } from "react";
import classNames from "../helpers/classNames";
import IconArrowDown from "../icons/ArrowDown";

export type Tab = {
  id: string;
  name: string;
  icon?: ComponentType<{ className?: string }>;
};

const tabDomId = (idPrefix: string | undefined, tabId: string) =>
  `${idPrefix ? `${idPrefix}-` : ""}tab-${tabId}`;
const panelDomId = (idPrefix: string | undefined, tabId: string) =>
  `${idPrefix ? `${idPrefix}-` : ""}panel-${tabId}`;

interface TabsProps {
  tabs: Tab[];
  current: string | null;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  selectLabel?: string;
  /** Scopes the tab and panel DOM ids when more than one tab list can appear on a page. */
  idPrefix?: string;
  /** When set, the mobile `<select>` includes an empty option for no selection. */
  placeholder?: string;
  /**
   * `"segmented"` renders a compact, content-width pill toggle (small text,
   * tight padding, active tab picked out with a light background) instead of
   * the default full-width strip — for a control that switches *which panel
   * you're looking at* rather than one that reads as a section of the page's
   * own navigation. Omit to keep the existing icon/no-icon inference.
   */
  variant?: "segmented";
}

export default function Tabs({
  tabs,
  current,
  onChange = () => {},
  ariaLabel = "Tabs",
  selectLabel = "Select a tab",
  idPrefix,
  placeholder,
  variant,
}: TabsProps) {
  const selectId = useId();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // With a placeholder, empty means "none selected". Without one, fall back to
  // the first tab so uncontrolled-looking selects stay valid HTML.
  const selectValue = current ?? (placeholder ? "" : tabs[0]?.id ?? "");
  const hasIcons = tabs.some((tab) => Boolean(tab.icon));
  const activeIndex = current ? tabs.findIndex((tab) => tab.id === current) : -1;
  // Keep one tab focusable when nothing is selected so keyboard users can enter the list.
  const focusableIndex = activeIndex >= 0 ? activeIndex : 0;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabIndex: number) => {
    if (tabs.length === 0) return;
    const getIndex = (index: number) => (index + tabs.length) % tabs.length;
    let nextIndex = tabIndex;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = getIndex(tabIndex + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = getIndex(tabIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    }
    if (event.key === "End") {
      event.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== tabIndex) {
      const nextTab = tabs[nextIndex];
      onChange(nextTab.id);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  if (!tabs.length) {
    return null;
  }

  return (
    <div>
      <div className={classNames("@sm:hidden relative", hasIcons ? "mt-0" : "mt-4")}>
        <label htmlFor={selectId} className="sr-only">
          {selectLabel}
        </label>
        <select
          id={selectId}
          name="tabs"
          value={selectValue}
          onChange={(ev) => onChange(ev.target.value)}
          className="block w-full appearance-none rounded-md border border-border bg-surface py-2 pl-3 pr-9 text-sm text-foreground-secondary focus:border-secondary-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.name}
            </option>
          ))}
        </select>
        <IconArrowDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground-muted" />
      </div>

      <div className={classNames("hidden @sm:block", hasIcons || variant === "segmented" ? "" : "mt-6")}>
        {variant === "segmented" ? (
          <div
            // Sized to read as the panel's primary mode switch (roughly
            // 280-340px by 36-40px) rather than a minor filter control, while
            // staying well short of the old full-width bar.
            className="inline-flex h-9.5 w-77.5 items-center gap-1 rounded-lg bg-neutral-100 p-1"
            role="tablist"
            aria-label={ariaLabel}
          >
            {tabs.map((tab, tabIndex) => {
              const isActive = tab.id === current;
              return (
                <button
                  ref={(el) => { buttonRefs.current[tabIndex] = el; }}
                  key={tab.id}
                  id={tabDomId(idPrefix, tab.id)}
                  type="button"
                  role="tab"
                  tabIndex={tabIndex === focusableIndex ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={panelDomId(idPrefix, tab.id)}
                  onClick={() => onChange(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
                  className={classNames(
                    "h-full flex-1 cursor-pointer rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  )}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        ) : hasIcons ? (
          <div
            className="border-b border-border"
            role="tablist"
            aria-label={ariaLabel}
          >
            <div className="flex flex-wrap gap-6">
              {tabs.map((tab, tabIndex) => {
                const isActive = tab.id === current;
                const Icon = tab.icon;

                return (
                  <button
                    ref={(el) => { buttonRefs.current[tabIndex] = el; }}
                    key={tab.id}
                    id={tabDomId(idPrefix, tab.id)}
                    type="button"
                    role="tab"
                    tabIndex={tabIndex === focusableIndex ? 0 : -1}
                    aria-selected={isActive}
                    aria-controls={panelDomId(idPrefix, tab.id)}
                    onClick={() => onChange(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
                    className={classNames(
                      "cursor-pointer border-b-2 px-1 py-3 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      <span>{tab.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <nav
            className="relative z-0 flex divide-x divide-border rounded-lg shadow"
            role="tablist"
            aria-label={ariaLabel}
          >
            {tabs.map((tab, tabIdx) => {
              const isActive = tab.id === current;
              return (
                <button
                  ref={(el) => { buttonRefs.current[tabIdx] = el; }}
                  key={tab.id}
                  id={tabDomId(idPrefix, tab.id)}
                  type="button"
                  role="tab"
                  tabIndex={tabIdx === focusableIndex ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={panelDomId(idPrefix, tab.id)}
                  onClick={() => onChange(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tabIdx)}
                  className={classNames(
                    isActive
                      ? "text-foreground"
                      : "text-foreground-muted hover:text-foreground-secondary",
                    tabIdx === 0 ? "rounded-l-lg" : "",
                    tabIdx === tabs.length - 1 ? "rounded-r-lg" : "",
                    "group relative min-w-0 flex-1 cursor-pointer overflow-hidden bg-surface px-4 py-4 text-center text-sm font-medium hover:bg-neutral-50 focus:z-10"
                  )}
                >
                  <span>{tab.name}</span>
                  <span
                    aria-hidden="true"
                    className={classNames(
                      isActive ? "bg-primary-500" : "bg-transparent",
                      "absolute inset-x-0 bottom-0 h-0.5"
                    )}
                  />
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

interface TabPanelsProps {
  tabs: Tab[];
  current: string;
  idPrefix?: string;
  renderPanel: (tab: Tab, active: boolean) => ReactNode;
}

/** Renders one linked ARIA panel per tab. The caller decides which panels
 * have mounted content, allowing visited panels to remain stateful. */
export function TabPanels({ tabs, current, idPrefix, renderPanel }: TabPanelsProps) {
  return (
    <>
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <div
            key={tab.id}
            id={panelDomId(idPrefix, tab.id)}
            role="tabpanel"
            aria-labelledby={tabDomId(idPrefix, tab.id)}
            hidden={!active}
            className={active ? "flex flex-col gap-6" : undefined}
          >
            {renderPanel(tab, active)}
          </div>
        );
      })}
    </>
  );
}
