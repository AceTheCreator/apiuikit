import type { ReactNode } from "react";
import TabToggle from "../TabToggle";

interface SchemaUnionBranchProps {
  variant?: "oneOf" | "anyOf";
  caseCount: number;
  caseLabels?: string[];
  selectedCase: number;
  onSelectCase: (index: number) => void;
  children: ReactNode;
}

/** Tabbed branch UI for oneOf/anyOf schemas — shows one case at a time. */
export default function SchemaUnionBranch({
  variant = "oneOf",
  caseCount,
  caseLabels,
  selectedCase,
  onSelectCase,
  children,
}: SchemaUnionBranchProps) {
  if (caseCount === 0) return null;

  const labels =
    caseLabels?.length === caseCount
      ? caseLabels
      : Array.from({ length: caseCount }, (_, index) => `case ${index + 1}`);

  const variantLabel = variant === "anyOf" ? "Any of:" : "One of:";
  const ariaLabel = variant === "anyOf" ? "Any of cases" : "One of cases";

  return (
    <div className="py-2">
      <div className="flex flex-col items-start">
        <span className="inline-block px-2 py-0.5 text-xs font-medium text-foreground-secondary border border-border rounded-md bg-surface">
          {variantLabel}
        </span>
        <div
          className="w-px h-3 bg-border ml-[1.125rem]"
          aria-hidden="true"
        />
      </div>

      <TabToggle
        tabs={labels.map((label, index) => ({ id: String(index), label }))}
        selected={String(selectedCase)}
        onChange={(id) => onSelectCase(Number(id))}
        ariaLabel={ariaLabel}
      />

      <div role="tabpanel" className="mt-2">
        {children}
      </div>
    </div>
  );
}
