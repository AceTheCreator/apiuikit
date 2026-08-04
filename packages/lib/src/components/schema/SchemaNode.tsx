import { useEffect, useMemo, useState } from "react";
import { isSchemaRecord, SchemaNodeData } from "../../types/schema";
import SchemaCaseDetail from "./SchemaCaseDetail";
import SchemaNotBranch, { BooleanNotPill } from "./SchemaNotBranch";
import SchemaUnionBranch from "./SchemaUnionBranch";
import SchemaTreeBranch, {
  type SchemaTreeBranchLineVariant,
} from "./SchemaTreeBranch";
import SchemaTreeRow from "./SchemaTreeRow";
import {
  EMPTY_ANCESTORS,
  flattenAllOf,
  getAdditionalItemsSchema,
  getAdditionalPropertiesSchema,
  getAllOfConditionals,
  getAnyOfItems,
  getContainsSchema,
  getItemSchema,
  getNotSchema,
  getOneOfItems,
  getPatternPropertiesEntries,
  getPropertyNamesSchema,
  getSubschema,
  getTupleItemSchemas,
  hasAllOfConditionals,
  hasExplicitProperties,
  hasIfThenElse,
  hasNotSchema,
  hasObjectMapContent,
  hasStructuralShape,
  isLeafItemSchema,
  mergeDescriptions,
  normalizeSchema,
  omitIfThenElse,
  omitNot,
  patternPropertyPath,
  schemaIdLabel,
  type SchemaAncestors,
} from "./schemaUtils";
import SchemaIfThenElseBranch from "./SchemaIfThenElseBranch";
import SchemaMapBranch from "./SchemaMapBranch";
import { useProtobufConverterReady } from "../../helpers/protobuf/lazyProtoToJsonSchema";

export interface SchemaNodeProps {
  schema: SchemaNodeData;
  path: string;
  depth: number;
  required?: boolean;
  refStack: Set<string>;
  deref: (ref: string) => unknown;
  /** When true, skip this node's row and render only its children. */
  suppressRow?: boolean;
  /** Left border style for nested branches; muted uses a grey dotted line. */
  branchLineVariant?: SchemaTreeBranchLineVariant;
  /** Whether this node (and its descendants) start expanded. Defaults to false. */
  defaultExpanded?: boolean;
  /**
   * Schemas already on the render path above this node. When this node's
   * schema is among them (by object identity or by $ref string), it is a
   * cycle — render a circular row instead of recursing forever.
   */
  ancestors?: SchemaAncestors;
  /**
   * Remaining steps toward a search-selected node, matching searchIndex.ts's
   * schemaFocusTokens convention — `null` once off the target path, `[]`
   * when this node IS the target. Consumed one "properties"+name / "items" /
   * "oneOf[i]"/"anyOf[i]" step at a time as it's threaded into children.
   */
  focusTokens?: string[] | null;
  /** The target node's DOM id — constant for the whole walk, applied once focusTokens is empty. */
  focusId?: string | null;
}

/** Nested nodes inside a branch-line-less wrapper regain depth-colored lines. */
const childBranchLineVariant = (
  variant: SchemaTreeBranchLineVariant
): SchemaTreeBranchLineVariant => (variant === "none" ? "depth" : variant);

/** Recursively renders one schema node and its descendants. */
export default function SchemaNode({
  schema: rawSchema,
  path,
  depth,
  required,
  refStack,
  deref,
  suppressRow = false,
  branchLineVariant = "depth",
  defaultExpanded = false,
  ancestors = EMPTY_ANCESTORS,
  focusTokens = null,
  focusId = null,
}: SchemaNodeProps) {
  const nestedBranchLineVariant = childBranchLineVariant(branchLineVariant);
  const isOnFocusPath = focusTokens != null;
  const isFocusTarget = isOnFocusPath && focusTokens!.length === 0;
  const rowId = isFocusTarget ? focusId ?? undefined : undefined;

  const [expanded, setExpanded] = useState(defaultExpanded || isOnFocusPath);
  // When `defaultExpanded` changes after mount (e.g. a live `expand.schemas` config
  // edit), re-apply it to every node, overriding manual toggles made under the old
  // default. Adjusted during render so the old state never paints.
  const [prevDefaultExpanded, setPrevDefaultExpanded] = useState(defaultExpanded);
  if (prevDefaultExpanded !== defaultExpanded) {
    setPrevDefaultExpanded(defaultExpanded);
    setExpanded(defaultExpanded || isOnFocusPath);
  }
  // A later search selection can target a node already on screen — force it open.
  useEffect(() => {
    if (isOnFocusPath) setExpanded(true);
  }, [isOnFocusPath]);

  const [selectedCase, setSelectedCase] = useState(0);
  // Parsed from the raw token string (e.g. "oneOf[1]") rather than checked
  // against `unionItems` — that's derived further down, after early returns
  // this hook can't follow, since Hooks must run unconditionally every render.
  const focusedCaseMatch = focusTokens?.[0]?.match(/^(?:oneOf|anyOf)\[(\d+)\]$/);
  const focusedCaseIndex = focusedCaseMatch ? Number(focusedCaseMatch[1]) : -1;
  useEffect(() => {
    if (focusedCaseIndex >= 0) setSelectedCase(focusedCaseIndex);
  }, [focusedCaseIndex]);

  // normalizeSchema below can hit resolveSchemaInput for a $ref'd Protobuf
  // multi-format wrapper, whose conversion is lazy-loaded — re-resolves once
  // ready. See lazyProtoToJsonSchema.ts.
  const protobufReady = useProtobufConverterReady();

  const { schema, refLabel, circular } = useMemo(() => {
    // Cross-render-level cycle check: this exact schema (or its $ref) is
    // already being rendered somewhere above us in the tree.
    if (
      ancestors.objects.has(rawSchema) ||
      (typeof rawSchema.$ref === "string" && ancestors.refs.has(rawSchema.$ref))
    ) {
      return {
        schema: rawSchema,
        refLabel: schemaIdLabel(rawSchema),
        circular: true,
      };
    }
    const normalized = normalizeSchema(rawSchema, deref, refStack);
    if (normalized.circular) return normalized;
    return {
      ...normalized,
      schema: flattenAllOf(normalized.schema, deref, refStack),
    };
    // protobufReady isn't read above, but normalizeSchema's result silently
    // depends on it via module-level state (lazyProtoToJsonSchema.ts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSchema, deref, refStack, ancestors, protobufReady]);

  // Chain handed to child nodes: everything above us, plus this node.
  const childAncestors = useMemo<SchemaAncestors>(
    () => ({
      objects: new Set(ancestors.objects).add(rawSchema),
      refs:
        typeof rawSchema.$ref === "string"
          ? new Set(ancestors.refs).add(rawSchema.$ref)
          : ancestors.refs,
    }),
    [ancestors, rawSchema],
  );

  // Strip logical operators before shape detection so they don't mask the true structure.
  const structuralSchema = omitNot(omitIfThenElse(schema));
  // True when the schema carries only logical operators with no displayable structural shape
  // (no type, properties, items, oneOf, anyOf). These render as just a row + meta children.
  const isMetaOnly =
    !hasStructuralShape(structuralSchema) &&
    (hasNotSchema(schema) || hasIfThenElse(schema) || hasAllOfConditionals(schema));

  const renderNotSection = () => {
    const notValue = getNotSchema(schema);
    if (notValue === null) return null;

    if (typeof notValue === "boolean") {
      return (
        <SchemaNotBranch>
          <BooleanNotPill value={notValue} />
        </SchemaNotBranch>
      );
    }

    const normalizedNot = normalizeSchema(notValue, deref, refStack);
    if (normalizedNot.circular) {
      return (
        <SchemaNotBranch>
          <SchemaTreeRow
            path={path}
            depth={depth + 1}
            typeLabelOverride={`↩ ${notValue.$ref}`}
            expandable={false}
            expanded={false}
            onToggle={() => undefined}
            showBorder={false}
          />
        </SchemaNotBranch>
      );
    }

    const flattenedNot = flattenAllOf(normalizedNot.schema, deref, refStack);
    const isLeafNot = isLeafItemSchema(flattenedNot);

    return (
      <SchemaNotBranch>
        {isLeafNot ? (
          <SchemaCaseDetail schema={flattenedNot} showBorder={false} />
        ) : (
          <SchemaNode
            schema={notValue}
            path={path}
            depth={depth + 1}
            refStack={refStack}
            deref={deref}
            ancestors={childAncestors}
            suppressRow
            branchLineVariant={nestedBranchLineVariant}
            defaultExpanded={defaultExpanded}
          />
        )}
      </SchemaNotBranch>
    );
  };

  const renderIfThenElseBranchSchema = (
    branchSchema: SchemaNodeData | boolean,
    branchPath: string
  ) => {
    if (typeof branchSchema === "boolean") {
      return (
        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-foreground-secondary">
          {branchSchema ? "any value" : "false schema"}
        </span>
      );
    }
    const normalized = normalizeSchema(branchSchema, deref, refStack);
    if (normalized.circular) {
      return (
        <SchemaTreeRow
          path={branchPath}
          depth={depth + 1}
          typeLabelOverride={`↩ ${branchSchema.$ref}`}
          expandable={false}
          expanded={false}
          onToggle={() => undefined}
          showBorder={false}
        />
      );
    }
    const flattened = flattenAllOf(normalized.schema, deref, refStack);
    if (isLeafItemSchema(flattened)) {
      return <SchemaCaseDetail schema={flattened} showBorder={false} />;
    }
    return (
      <SchemaNode
        schema={branchSchema}
        path={branchPath}
        depth={depth + 1}
        refStack={refStack}
        deref={deref}
        ancestors={childAncestors}
        suppressRow
        branchLineVariant="none"
        defaultExpanded={defaultExpanded}
      />
    );
  };

  /**
   * Renders a single if/then/else as a consolidated card with labeled sections.
   * Nested if/then/else in an else branch is handled automatically: renderIfThenElseBranchSchema
   * passes the else schema to SchemaNode, which detects hasIfThenElse and re-enters here,
   * producing a nested card inside the Else: section.
   */
  const renderSingleIfThenElse = (condSchema: SchemaNodeData) => {
    const ifVal = getSubschema(condSchema.if);
    if (ifVal === null) return null;
    const thenVal = getSubschema(condSchema.then);
    const elseVal = getSubschema(condSchema.else);
    return (
      <SchemaIfThenElseBranch
        ifContent={renderIfThenElseBranchSchema(ifVal, path)}
        thenContent={thenVal !== null ? renderIfThenElseBranchSchema(thenVal, path) : undefined}
        elseContent={elseVal !== null ? renderIfThenElseBranchSchema(elseVal, path) : undefined}
      />
    );
  };


  const renderAllOfConditionals = () => {
    const conditionals = getAllOfConditionals(schema);
    if (conditionals.length === 0) return null;
    return (
      <>
        {conditionals.map((cond, idx) => (
          <div key={idx}>
            {renderSingleIfThenElse(cond)}
          </div>
        ))}
      </>
    );
  };

  if (circular) {
    // Identity cycles (pre-resolved documents) have no $ref string — fall back
    // to the schema's stamped name, then to a generic marker.
    return (
      <SchemaTreeRow
        id={rowId}
        path={path}
        depth={depth}
        typeLabelOverride={`↩ ${rawSchema.$ref ?? refLabel ?? "circular"}`}
        expandable={false}
        expanded={false}
        onToggle={() => undefined}
      />
    );
  }

  if (isMetaOnly) {
    const metaContent = (
      <>
        {hasNotSchema(schema) && renderNotSection()}
        {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
        {hasAllOfConditionals(schema) && renderAllOfConditionals()}
      </>
    );

    if (suppressRow) {
      return metaContent;
    }

    return (
      <>
        <SchemaTreeRow
          id={rowId}
          path={path}
          depth={depth}
          schema={schema}
          refLabel={refLabel}
          required={required}
          description={schema.description}
          expandable
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>
            {metaContent}
          </SchemaTreeBranch>
        )}
      </>
    );
  }

  const oneOfItems = getOneOfItems(structuralSchema);
  const anyOfItems = getAnyOfItems(structuralSchema);
  const unionItems = oneOfItems ?? anyOfItems;
  const unionVariant = oneOfItems ? "oneOf" : "anyOf";

  if (unionItems) {
    const caseLabels = unionItems.map((item, index) =>
      typeof item.title === "string" ? item.title : `case ${index + 1}`
    );
    const caseDepth = suppressRow ? 1 : depth + 1;
    const selectedRaw = unionItems[selectedCase]!;
    const normalizedCase = normalizeSchema(selectedRaw, deref, refStack);
    const selectedCaseSchema = normalizedCase.circular
      ? normalizedCase.schema
      : flattenAllOf(normalizedCase.schema, deref, refStack);
    const isLeafCase =
      !normalizedCase.circular && isLeafItemSchema(selectedCaseSchema);

    // Only forward the remaining focus tokens into the currently-selected
    // case — `focusedCaseIndex` (matched above, before this component's
    // early returns) already forced `selectedCase` to match when relevant.
    const caseFocusTokens =
      focusTokens && focusedCaseIndex === selectedCase ? focusTokens.slice(1) : null;

    const caseContent = isLeafCase ? (
      <SchemaCaseDetail schema={selectedCaseSchema} showBorder={false} />
    ) : (
      <SchemaNode
        key={selectedCase}
        schema={selectedRaw}
        path={path}
        depth={caseDepth - 1}
        refStack={refStack}
        deref={deref}
        ancestors={childAncestors}
        suppressRow
        branchLineVariant="none"
        defaultExpanded={defaultExpanded}
        focusTokens={caseFocusTokens}
        focusId={focusId}
      />
    );

    const unionBranch = (
      <SchemaUnionBranch
        variant={unionVariant}
        caseCount={unionItems.length}
        caseLabels={caseLabels}
        selectedCase={selectedCase}
        onSelectCase={setSelectedCase}
      >
        {caseContent}
      </SchemaUnionBranch>
    );

    const unionContent = (
      <>
        {unionBranch}
        {hasNotSchema(schema) && renderNotSection()}
        {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
        {hasAllOfConditionals(schema) && renderAllOfConditionals()}
      </>
    );

    if (suppressRow) {
      return unionContent;
    }

    return (
      <>
        <SchemaTreeRow
          id={rowId}
          path={path}
          depth={depth}
          schema={schema}
          refLabel={refLabel}
          required={required}
          description={schema.description}
          expandable
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>{unionContent}</SchemaTreeBranch>
        )}
      </>
    );
  }

  const renderMapSubschema = (
    mapSchema: SchemaNodeData,
    mapPath: string,
    mapDepth: number
  ) => {
    const normalizedMap = normalizeSchema(mapSchema, deref, refStack);
    if (normalizedMap.circular) {
      return (
        <SchemaTreeRow
          path={mapPath}
          depth={mapDepth}
          typeLabelOverride={`↩ ${mapSchema.$ref}`}
          expandable={false}
          expanded={false}
          onToggle={() => undefined}
          showBorder={false}
        />
      );
    }

    const flattenedMap = flattenAllOf(normalizedMap.schema, deref, refStack);
    if (isLeafItemSchema(flattenedMap)) {
      return <SchemaCaseDetail schema={flattenedMap} showBorder={false} />;
    }

    return (
      <SchemaNode
        schema={mapSchema}
        path={mapPath}
        depth={mapDepth}
        refStack={refStack}
        deref={deref}
        ancestors={childAncestors}
        branchLineVariant={nestedBranchLineVariant}
        defaultExpanded={defaultExpanded}
      />
    );
  };

  const renderObjectChildren = (childDepth: number) => {
    const properties = structuralSchema.properties ?? {};
    const requiredFields = new Set(structuralSchema.required ?? []);
    const propertyNamesSchema = getPropertyNamesSchema(structuralSchema);
    const additionalPropertiesSchema =
      getAdditionalPropertiesSchema(structuralSchema);
    const patternEntries = getPatternPropertiesEntries(structuralSchema);

    return (
      <>
        {Object.entries(properties).map(([name, prop]) => {
          if (!isSchemaRecord(prop)) return null;
          const propFocusTokens =
            focusTokens && focusTokens[0] === "properties" && focusTokens[1] === name
              ? focusTokens.slice(2)
              : null;
          return (
            <SchemaNode
              key={name}
              schema={prop}
              path={`${path}.${name}`}
              depth={childDepth}
              required={requiredFields.has(name)}
              refStack={refStack}
              deref={deref}
              ancestors={childAncestors}
              branchLineVariant={nestedBranchLineVariant}
              defaultExpanded={defaultExpanded}
              focusTokens={propFocusTokens}
              focusId={focusId}
            />
          );
        })}
        {propertyNamesSchema !== null &&
          isSchemaRecord(propertyNamesSchema) && (
            <SchemaMapBranch label="Property names must adhere to:">
              {renderMapSubschema(
                propertyNamesSchema,
                `${path}.[propertyName]`,
                childDepth
              )}
            </SchemaMapBranch>
          )}
        {patternEntries.map(([pattern, subSchema]) => (
          <SchemaNode
            key={pattern}
            schema={subSchema}
            path={patternPropertyPath(path, pattern)}
            depth={childDepth}
            refStack={refStack}
            deref={deref}
            ancestors={childAncestors}
            branchLineVariant={nestedBranchLineVariant}
            defaultExpanded={defaultExpanded}
          />
          ))}
        {additionalPropertiesSchema !== null &&
          isSchemaRecord(additionalPropertiesSchema) && (
            <SchemaMapBranch label="Additional properties must adhere to:">
              {renderMapSubschema(
                additionalPropertiesSchema,
                `${path}.[additionalProperty]`,
                childDepth
              )}
            </SchemaMapBranch>
          )}
        {hasNotSchema(schema) && renderNotSection()}
        {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
        {hasAllOfConditionals(schema) && renderAllOfConditionals()}
      </>
    );
  };

  const hasObjectChildren =
    hasExplicitProperties(structuralSchema) || hasObjectMapContent(structuralSchema);

  if (hasObjectChildren) {
    if (suppressRow) {
      return renderObjectChildren(depth + 1);
    }

    return (
      <>
        <SchemaTreeRow
          id={rowId}
          path={path}
          depth={depth}
          schema={schema}
          refLabel={refLabel}
          required={required}
          description={schema.description}
          expandable
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>
            {renderObjectChildren(depth + 1)}
          </SchemaTreeBranch>
        )}
      </>
    );
  }

  if (structuralSchema.type === "array" || structuralSchema.items) {
    const tupleSchemas = getTupleItemSchemas(structuralSchema);
    const isTuple = tupleSchemas !== null;
    const additionalItemsSchema = isTuple ? getAdditionalItemsSchema(structuralSchema) : null;
    const containsSchema = getContainsSchema(structuralSchema);
    const hasContainsSchema = containsSchema !== null;

    const itemSchema = isTuple ? null : getItemSchema(structuralSchema);
    const hasItem = itemSchema !== null;
    // Guards the suppressRow toggle — prevents rendering an expand button for empty arrays.
    const hasArrayContent =
      isTuple || hasItem || hasContainsSchema ||
      hasNotSchema(schema) || hasIfThenElse(schema) || hasAllOfConditionals(schema);
    const arrayPath = `${path}[]`;
    // When the array's own row is suppressed (SchemaTree rootName), children are
    // the first visible rows — drop the `[]` so paths read `Body.id` not `Body[].id`.
    const itemPathBase = suppressRow ? path : arrayPath;

    // The resolved-but-unflattened item source keeps a stable identity across
    // unrolls of a recursive schema (flattening copies, resolution doesn't) —
    // it's what makes the item-level cycle check below possible.
    const normalizedItem = hasItem
      ? normalizeSchema(itemSchema, deref, refStack)
      : null;
    const itemSource = normalizedItem?.schema ?? null;
    const resolvedItem = itemSource
      ? flattenAllOf(itemSource, deref, refStack)
      : null;
    // Items rendered through itemProperties below never pass their $ref node
    // through a child SchemaNode, so the generic ancestor check can't see the
    // cycle — check the item source against the chain here instead.
    const itemCircular =
      itemSource !== null &&
      (childAncestors.objects.has(itemSource) ||
        (typeof itemSchema?.$ref === "string" &&
          childAncestors.refs.has(itemSchema.$ref)));
    const itemAncestors: SchemaAncestors =
      itemSource !== null
        ? {
            objects: new Set(childAncestors.objects).add(itemSource),
            refs:
              typeof itemSchema?.$ref === "string"
                ? new Set(childAncestors.refs).add(itemSchema.$ref)
                : childAncestors.refs,
          }
        : childAncestors;
    const isLeafArray =
      !isTuple &&
      !hasContainsSchema &&
      resolvedItem !== null &&
      isLeafItemSchema(resolvedItem);
    const itemProperties =
      resolvedItem?.properties
        ? Object.entries(resolvedItem.properties).filter(([, prop]) =>
            isSchemaRecord(prop)
          )
        : [];
    const itemRequired = new Set(
      resolvedItem && Array.isArray(resolvedItem.required)
        ? resolvedItem.required
        : []
    );
    // Non-tuple array items always consume one "items" token, whether or not
    // the renderer below ends up giving the item its own row (a decomposed
    // object item skips straight to its properties) — the id only needs to
    // be unique and match what searchIndex.ts computed, not mirror the DOM.
    const itemFocusTokens =
      !isTuple && focusTokens && focusTokens[0] === "items" ? focusTokens.slice(1) : null;

    const renderArrayExpansion = (childDepth: number) => (
      <>
        {isTuple ? (
          <>
            {tupleSchemas.map((itemSch, idx) => (
              <SchemaNode
                key={idx}
                schema={itemSch}
                path={`${path}[${idx}]`}
                depth={childDepth}
                refStack={refStack}
                deref={deref}
                ancestors={childAncestors}
                branchLineVariant={nestedBranchLineVariant}
                defaultExpanded={defaultExpanded}
              />
            ))}
            {additionalItemsSchema !== null &&
              typeof additionalItemsSchema !== "boolean" && (
                <SchemaMapBranch label="Additional items:">
                  {renderMapSubschema(
                    additionalItemsSchema,
                    `${path}[*]`,
                    childDepth
                  )}
                </SchemaMapBranch>
              )}
            {additionalItemsSchema === false && (
              <div className="py-1 pl-6 text-xs text-foreground-muted">
                no additional items allowed
              </div>
            )}
          </>
        ) : (
          hasItem &&
          (itemCircular ? (
            <SchemaTreeRow
              path={itemPathBase}
              depth={childDepth}
              typeLabelOverride={`↩ ${
                itemSchema.$ref ?? schemaIdLabel(itemSource!) ?? "circular"
              }`}
              expandable={false}
              expanded={false}
              onToggle={() => undefined}
              showBorder={false}
            />
          ) : itemProperties.length > 0
            ? itemProperties.map(([name, prop]) => {
                const propFocusTokens =
                  itemFocusTokens && itemFocusTokens[0] === "properties" && itemFocusTokens[1] === name
                    ? itemFocusTokens.slice(2)
                    : null;
                return (
                  <SchemaNode
                    key={name}
                    schema={prop}
                    path={`${itemPathBase}.${name}`}
                    depth={childDepth}
                    required={itemRequired.has(name)}
                    refStack={refStack}
                    deref={deref}
                    ancestors={itemAncestors}
                    branchLineVariant={nestedBranchLineVariant}
                    defaultExpanded={defaultExpanded}
                    focusTokens={propFocusTokens}
                    focusId={focusId}
                  />
                );
              })
            : (
                <SchemaNode
                  schema={itemSchema!}
                  path={itemPathBase}
                  depth={childDepth}
                  refStack={refStack}
                  deref={deref}
                  ancestors={itemAncestors}
                  branchLineVariant={nestedBranchLineVariant}
                  defaultExpanded={defaultExpanded}
                  focusTokens={itemFocusTokens}
                  focusId={focusId}
                />
              ))
        )}
        {hasContainsSchema && (
          <SchemaMapBranch label="Contains at least one:">
            {/* boolean contains: true → any item qualifies, false → impossible constraint */}
            {typeof containsSchema === "boolean" ? (
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-foreground-secondary">
                {containsSchema ? "any item" : "impossible constraint"}
              </span>
            ) : (
              renderMapSubschema(containsSchema!, `${path}[contains]`, childDepth)
            )}
          </SchemaMapBranch>
        )}
        {hasNotSchema(schema) && renderNotSection()}
        {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
        {hasAllOfConditionals(schema) && renderAllOfConditionals()}
      </>
    );

    if (isLeafArray && !hasNotSchema(schema) && !hasIfThenElse(schema) && !hasAllOfConditionals(schema)) {
      return (
        <SchemaTreeRow
          id={rowId}
          path={arrayPath}
          depth={depth}
          schema={schema}
          itemSchema={resolvedItem}
          refLabel={refLabel}
          required={required}
          description={mergeDescriptions(
            schema.description,
            resolvedItem!.description
          )}
          expandable={false}
          expanded={false}
          onToggle={() => undefined}
        />
      );
    }

    if (isLeafArray) {
      return (
        <>
          <SchemaTreeRow
            id={rowId}
            path={arrayPath}
            depth={depth}
            schema={schema}
            itemSchema={resolvedItem}
            refLabel={refLabel}
            required={required}
            description={mergeDescriptions(
              schema.description,
              resolvedItem!.description
            )}
            expandable
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
          {expanded && (
            <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>
              {hasNotSchema(schema) && renderNotSection()}
              {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
              {hasAllOfConditionals(schema) && renderAllOfConditionals()}
            </SchemaTreeBranch>
          )}
        </>
      );
    }

    if (suppressRow) {
      // Render nothing for bare { type:'array' } with no items/contains/conditionals.
      if (!hasArrayContent) return null;
      return renderArrayExpansion(depth + 1);
    }

    return (
      <>
        <SchemaTreeRow
          id={rowId}
          path={arrayPath}
          depth={depth}
          schema={schema}
          itemSchema={resolvedItem}
          refLabel={refLabel}
          required={required}
          description={schema.description}
          expandable={
            isTuple ||
            hasItem ||
            hasContainsSchema ||
            hasNotSchema(schema) ||
            hasIfThenElse(schema) ||
            hasAllOfConditionals(schema)
          }
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>
            {renderArrayExpansion(depth + 1)}
          </SchemaTreeBranch>
        )}
      </>
    );
  }

  // Scalar (or otherwise typed) schemas that also carry logical operators but weren't
  // caught by the object/array/union branches above — e.g. { type: "string", if: … }.
  if (hasNotSchema(schema) || hasIfThenElse(schema) || hasAllOfConditionals(schema)) {
    const metaOnlyContent = (
      <>
        {hasNotSchema(schema) && renderNotSection()}
        {hasIfThenElse(schema) && renderSingleIfThenElse(schema)}
        {hasAllOfConditionals(schema) && renderAllOfConditionals()}
      </>
    );

    if (suppressRow) {
      return metaOnlyContent;
    }

    return (
      <>
        <SchemaTreeRow
          id={rowId}
          path={path}
          depth={depth}
          schema={schema}
          refLabel={refLabel}
          required={required}
          description={schema.description}
          expandable
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <SchemaTreeBranch depth={depth} lineVariant={branchLineVariant}>
            {metaOnlyContent}
          </SchemaTreeBranch>
        )}
      </>
    );
  }

  if (suppressRow) return null;

  return (
    <SchemaTreeRow
      id={rowId}
      path={path}
      depth={depth}
      schema={schema}
      refLabel={refLabel}
      required={required}
      description={schema.description}
      expandable={false}
      expanded={false}
      onToggle={() => undefined}
    />
  );
}
