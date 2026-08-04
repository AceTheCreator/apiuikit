import { useMemo } from "react";
import { useAsyncAPIDocument } from "../../contexts";
import { asSchemaNode } from "../../types/schema";
import SchemaNode from "./SchemaNode";
import SchemaTreeRow from "./SchemaTreeRow";
import {
  flattenAllOf,
  getItemSchema,
  hasExpandableContent,
  isLeafItemSchema,
  mergeDescriptions,
  refNameFromPath,
} from "./schemaUtils";

export interface SchemaTreeProps {
  schema: unknown;
  /** When set, the name is assumed shown by the parent — the root row is skipped and children render directly. */
  rootName?: string;
  className?: string;
  /** Remaining steps toward a search-selected node — see SchemaNode's own doc. */
  focusTokens?: string[] | null;
  /** The target node's DOM id, paired with focusTokens. */
  focusId?: string | null;
}

/** Entry point: renders a full schema tree with $ref resolution and expand/collapse. */
export default function SchemaTree({
  schema,
  rootName,
  className = "",
  focusTokens = null,
  focusId = null,
}: SchemaTreeProps) {
  const { deref, defaultSchemaExpanded = false } = useAsyncAPIDocument();
  const refStack = useMemo(() => new Set<string>(), []);
  const node = asSchemaNode(schema);
  const flattenedNode = useMemo(
    () => (node ? flattenAllOf(node, deref, refStack) : null),
    [node, deref, refStack]
  );

  if (!node || !flattenedNode) {
    return (
      <p className="text-xs text-foreground-muted italic">
        No schema details available.
      </p>
    );
  }

  const initialPath =
    rootName ??
    (node.$ref ? refNameFromPath(node.$ref) : undefined) ??
    "schema";

  const suppressRootRow = Boolean(rootName);
  const expandable = hasExpandableContent(flattenedNode, deref);

  if (!expandable && !node.$ref) {
    if (suppressRootRow) {
      if (flattenedNode.type === "array" || flattenedNode.items) {
        return (
          <div className={className}>
            <SchemaNode
              schema={node}
              path={initialPath}
              depth={0}
              refStack={refStack}
              deref={deref}
              defaultExpanded={defaultSchemaExpanded}
              focusTokens={focusTokens}
              focusId={focusId}
            />
          </div>
        );
      }
      return null;
    }

    const arrayPath =
      flattenedNode.type === "array" || flattenedNode.items
        ? `${initialPath}[]`
        : initialPath;

    const itemSchema = getItemSchema(flattenedNode);
    const resolvedItem =
      itemSchema ? flattenAllOf(itemSchema, deref, refStack) : null;
    const isLeafArray =
      resolvedItem !== null && isLeafItemSchema(resolvedItem);

    return (
      <div className={className}>
        <SchemaTreeRow
          path={arrayPath}
          depth={0}
          schema={flattenedNode}
          itemSchema={isLeafArray ? resolvedItem : undefined}
          description={
            flattenedNode.type === "array" || flattenedNode.items
              ? mergeDescriptions(
                flattenedNode.description,
                itemSchema?.description
              )
              : flattenedNode.description
          }
          expandable={false}
          expanded={false}
          onToggle={() => undefined}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <SchemaNode
        schema={node}
        path={initialPath}
        // When the root row is suppressed, its children are the first thing a user
        // actually sees — start them at depth 0 (not 1) so the depth palette's first
        // color applies to the first visible nesting level, not the invisible root.
        depth={suppressRootRow ? -1 : 0}
        refStack={refStack}
        deref={deref}
        suppressRow={suppressRootRow}
        defaultExpanded={defaultSchemaExpanded}
        focusTokens={focusTokens}
        focusId={focusId}
      />
    </div>
  );
}
