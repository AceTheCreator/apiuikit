import type { ReactNode } from "react";
import SchemaTreeBranch from "./SchemaTreeBranch";

interface SchemaIfThenElseBranchProps {
  ifContent: ReactNode;
  /** Omit when the then keyword was absent. */
  thenContent?: ReactNode;
  /** Omit when the else keyword was absent. */
  elseContent?: ReactNode;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="pt-2 pb-0.5 first:pt-0">
        <span className="text-xs font-medium text-foreground-secondary">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Consolidated if/then/else block with one continuous muted left line. */
export default function SchemaIfThenElseBranch({
  ifContent,
  thenContent,
  elseContent,
}: SchemaIfThenElseBranchProps) {
  return (
    <div className="py-2 pt-5 px-1">
      <div className="flex flex-col items-start">
        <span className="inline-block px-2 py-0.5 text-xs font-medium text-foreground-secondary border-2 border-dashed border-border rounded-md bg-surface">
          Conditions apply:
        </span>
      </div>
      <SchemaTreeBranch depth={0} lineVariant="muted">
        <div className="divide-y divide-border">
          <Section label="If schema matches:">{ifContent}</Section>
          {thenContent != null && <Section label="Then schema should follow:">{thenContent}</Section>}
          {elseContent != null && <Section label="Else schema should follow:">{elseContent}</Section>}
        </div>
      </SchemaTreeBranch>
    </div>
  );
}
