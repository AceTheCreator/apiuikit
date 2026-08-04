import { useRef, type KeyboardEvent } from "react";

interface TabToggleProps<T extends string> {
  tabs: { id: T; label: string }[];
  selected: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}

export default function TabToggle<T extends string>({
  tabs,
  selected,
  onChange,
  ariaLabel,
}: TabToggleProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const getIndex = (index: number) => (index + tabs.length) % tabs.length;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = getIndex(index + 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = getIndex(index - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    }

    if (event.key === "End") {
      event.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== index) {
      onChange(tabs[nextIndex].id);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 bg-neutral-100 rounded-md border border-border"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map(({ id, label }, index) => {
        const isActive = id === selected;
        return (
          <button
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={
              isActive
                ? "px-3 py-1 text-xs font-semibold text-foreground bg-surface rounded-md shadow-sm border border-border"
                : "px-3 py-1 text-xs font-medium text-foreground-muted hover:text-foreground-secondary rounded-md"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
