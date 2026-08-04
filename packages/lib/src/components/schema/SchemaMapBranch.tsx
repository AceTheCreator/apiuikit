import type { ReactNode } from "react";

interface SchemaMapBranchProps {
  label: string;
  children: ReactNode;
}

/** Labeled branch UI for object map keywords (propertyNames, additionalProperties). */
export default function SchemaMapBranch({
  label,
  children,
}: SchemaMapBranchProps) {
  return (
    <div className="py-2">
      <div className="flex flex-col items-start">
        <span className="inline-block px-2 py-0.5 text-xs font-medium text-foreground-secondary border border-border rounded-md bg-surface">
          {label}
        </span>
        <div
          className="w-px h-3 bg-border ml-[1.125rem]"
          aria-hidden="true"
        />
      </div>
      {children}
    </div>
  );
}
