import type { ReactNode } from "react";

interface ItemCardProps {
  /** The item's identity row: what the list's side panel shows as its title. */
  title: ReactNode;
  /** Rendered at the end of the title row, e.g. the Try-it button. */
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * The inline frame a single-item section (one endpoint, one operation) renders
 * its detail in: the same header row and body padding as SidePanel, laid out
 * in the page flow instead of a drawer, so the detail reads identically in
 * both places.
 */
export default function ItemCard({ title, headerActions, children }: ItemCardProps) {
  return (
    <article className="rounded-lg border border-border bg-background overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="text-sm font-semibold text-foreground min-w-0 flex-1 overflow-hidden">{title}</div>
        {headerActions}
      </header>
      <div className="px-5 py-4">{children}</div>
    </article>
  );
}
