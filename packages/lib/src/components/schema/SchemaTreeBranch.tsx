import type { ReactNode } from "react";
import { getDepthColor } from "./depthColors";
import { useAsyncAPIDocument } from "../../contexts";

export type SchemaTreeBranchLineVariant = "depth" | "muted" | "none";

const MUTED_LINE = "ml-0 border-dashed border-border";

/** Indented child container with a depth-colored left line — no box borders. */
export default function SchemaTreeBranch({
  depth,
  children,
  lineVariant = "depth",
}: {
  depth: number;
  children: ReactNode;
  lineVariant?: SchemaTreeBranchLineVariant;
}) {
  const { depthColors } = useAsyncAPIDocument();

  if (lineVariant === "none") {
    return <div>{children}</div>;
  }

  if (lineVariant === "muted") {
    return <div className={`pl-3 border-l-2 ${MUTED_LINE}`}>{children}</div>;
  }

  return (
    <div
      className="pl-3 border-l-2 ml-1.5"
      style={{ borderColor: getDepthColor(depth, depthColors) }}
    >
      {children}
    </div>
  );
}
