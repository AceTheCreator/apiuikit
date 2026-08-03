import { HttpMethod } from "../types/openapi";
import { OperationAction } from "../types/asyncapi/OperationAction";
import { METHOD_BADGE_COLOR_CLASSNAME } from "../contants";

export type MethodBadgeSize = "sm" | "xs";

const SIZE_CLASSNAME: Record<MethodBadgeSize, string> = {
  sm: "px-2.5 py-1 rounded-md text-xs",
  xs: "px-1.5 py-0.5 rounded text-[10px]",
};

interface MethodBadgeProps {
  /** An OpenAPI HTTP method or an AsyncAPI operation action — same pill, one color map. Renders nothing when undefined (e.g. an operation with no action yet). */
  method: HttpMethod | OperationAction | undefined;
  /** `sm` for detail/table contexts, `xs` for compact ones like the nav. Defaults to `sm`. */
  size?: MethodBadgeSize;
  /** Extra layout classes for the specific spot it's dropped into (e.g. a fixed table-column width). */
  className?: string;
}

/** The method/action color pill shared across OpenAPI's endpoint detail, its endpoints table, and AsyncAPI's operation list/detail/nav — one place for the method→color mapping, for both specs. */
export default function MethodBadge({ method, size = "sm", className = "" }: MethodBadgeProps) {
  if (!method) return null;

  return (
    <span
      className={`inline-flex items-center justify-center font-medium uppercase ${SIZE_CLASSNAME[size]} ${METHOD_BADGE_COLOR_CLASSNAME[method]} ${className}`}
    >
      {method}
    </span>
  );
}
