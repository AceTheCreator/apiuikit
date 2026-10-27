import type { ReactNode } from "react";
import { ArazzoLinksContext, scrollTo, useArazzoLinks } from "./arazzoLinksContext";

export function ArazzoLinksProvider({
  scope,
  onSelect,
  selectedKey,
  children,
}: {
  scope: string;
  /** Called before scrolling, e.g. to record the selection. */
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
  children: ReactNode;
}) {
  const goTo = (key: string) => {
    onSelect?.(key);
    scrollTo(key, scope);
  };
  return <ArazzoLinksContext.Provider value={{ scope, goTo, selectedKey }}>{children}</ArazzoLinksContext.Provider>;
}

/** An in-page link to a workflow or step, by key. */
export function ArazzoLink({ to, children, className = "" }: { to: string; children: ReactNode; className?: string }) {
  const { goTo } = useArazzoLinks();
  return (
    <button
      type="button"
      onClick={() => goTo(to)}
      className={`font-mono text-primary-600 hover:underline underline-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}
