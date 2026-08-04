import classNames from "../helpers/classNames"

type VerticalNavigationProps = {
    serverNames?: string[];
    current?: string;
    setCurrent: (name: string) => void;
  };

export default function VerticalNavigation({ serverNames = [], current, setCurrent }: VerticalNavigationProps) {
    return (
      <nav className="space-y-1 w-max mt-10 @lg:mt-0" aria-label="Sidebar">
        {serverNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCurrent(name)}
            aria-current={current === name ? "page" : undefined}
            className={classNames(
              current === name
                ? "border-l-4 border-neutral-300 text-foreground"
                : "text-foreground-secondary hover:text-foreground",
              "flex items-center px-3 py-2 text-sm font-medium cursor-pointer w-full text-left",
            )}
          >
            <span className="truncate">{name}</span>
          </button>
        ))}
      </nav>
    );
  }