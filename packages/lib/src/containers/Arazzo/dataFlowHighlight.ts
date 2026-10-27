import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * The value being pointed at (a chip hovered or focused) within one
 * workflow. It lives outside React state so that pointing at a chip
 * re-renders only the chips, steps and outputs whose highlight changes, not
 * the whole workflow.
 */
export class DataFlowHighlight {
  private active: string | null = null;
  private readonly listeners = new Set<() => void>();

  get = () => this.active;

  set = (valueKey: string | null) => {
    if (valueKey === this.active) return;
    this.active = valueKey;
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export const DataFlowHighlightContext = createContext<DataFlowHighlight | null>(null);

export const useDataFlowHighlight = () => useContext(DataFlowHighlightContext);

const noSubscription = () => () => {};

/**
 * How `produces` and `consumes` relate to the value being pointed at:
 * `producer`, `consumer`, or null. Re-renders only when that answer changes.
 */
export function useHighlightRole(produces: ReadonlySet<string>, consumes?: ReadonlySet<string>): "producer" | "consumer" | null {
  const store = useDataFlowHighlight();
  const role = () => {
    const active = store?.get();
    if (!active) return null;
    if (produces.has(active)) return "producer";
    return consumes?.has(active) ? "consumer" : null;
  };
  return useSyncExternalStore(store?.subscribe ?? noSubscription, role, role);
}

/** Whether `valueKey` is the value being pointed at. */
export function useIsHighlighted(valueKey: string | undefined): boolean {
  const store = useDataFlowHighlight();
  const highlighted = () => !!valueKey && store?.get() === valueKey;
  return useSyncExternalStore(store?.subscribe ?? noSubscription, highlighted, highlighted);
}
