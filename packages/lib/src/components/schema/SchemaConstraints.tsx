import { SchemaNodeData, isSchemaRecord } from "../../types/schema";
import {
  getAdditionalPropertiesSchema,
  getPropertyNamesSchema,
  isLeafItemSchema,
} from "./schemaUtils";

export interface SchemaConstraintsProps {
  schema: SchemaNodeData;
  itemSchema?: SchemaNodeData | null;
  /** Property name shown in range notation, e.g. `0 ≤ score ≤ 100`. */
  fieldName?: string;
  className?: string;
}

type BoundOp = "<" | "≤";

interface NumericBound {
  value: number;
  op: BoundOp;
}

function constraintValueDisplay(value: unknown): string {
  return JSON.stringify(value);
}

function constraintValueCopyText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function Label({ children }: { children: string }) {
  return <span className="text-xs text-foreground-muted">{children}</span>;
}

function Pill({
  children,
  mono = false,
  title,
}: {
  children: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-foreground-secondary"
      title={title}
    >
      {mono ? (
        <span className="font-mono text-foreground">{children}</span>
      ) : (
        children
      )}
    </span>
  );
}

function getLowerBound(schema: SchemaNodeData): NumericBound | null {
  if (typeof schema.exclusiveMinimum === "number") {
    return { value: schema.exclusiveMinimum, op: "<" };
  }
  if (typeof schema.minimum === "number") {
    return { value: schema.minimum, op: "≤" };
  }
  return null;
}

function getUpperBound(schema: SchemaNodeData): NumericBound | null {
  if (typeof schema.exclusiveMaximum === "number") {
    return { value: schema.exclusiveMaximum, op: "<" };
  }
  if (typeof schema.maximum === "number") {
    return { value: schema.maximum, op: "≤" };
  }
  return null;
}

function getLengthLowerBound(schema: SchemaNodeData): NumericBound | null {
  if (typeof schema.minLength === "number") {
    return { value: schema.minLength, op: "≤" };
  }
  return null;
}

function getLengthUpperBound(schema: SchemaNodeData): NumericBound | null {
  if (typeof schema.maxLength === "number") {
    return { value: schema.maxLength, op: "≤" };
  }
  return null;
}

function getCountLowerBound(
  schema: SchemaNodeData,
  key: "minItems" | "minProperties"
): NumericBound | null {
  const value = schema[key];
  if (typeof value === "number") {
    return { value, op: "≤" };
  }
  return null;
}

function getCountUpperBound(
  schema: SchemaNodeData,
  key: "maxItems" | "maxProperties"
): NumericBound | null {
  const value = schema[key];
  if (typeof value === "number") {
    return { value, op: "≤" };
  }
  return null;
}

/** Renders `0 ≤ score ≤ 100` with inequality symbols pointing at the name. */
function ValueRange({
  name,
  lower,
  upper,
  suffix,
}: {
  name: string;
  lower?: NumericBound | null;
  upper?: NumericBound | null;
  suffix?: string;
}) {
  if (!lower && !upper) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {lower && (
        <>
          <Label>{String(lower.value)}</Label>
          <Label>{lower.op}</Label>
        </>
      )}
      <Label>{name}</Label>
      {upper && (
        <>
          <Label>{upper.op}</Label>
          <Label>{String(upper.value)}</Label>
        </>
      )}
      {suffix && <Label>{suffix}</Label>}
    </span>
  );
}

function CopyablePill({ value, displayValue }: { value: unknown; displayValue?: string }) {
  const handleCopy = () => {
    const selection = window.getSelection()?.toString();
    if (selection) return;

    void navigator.clipboard.writeText(constraintValueCopyText(value));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void navigator.clipboard.writeText(constraintValueCopyText(value));
  };

  return (
    <span
      role="button"
      tabIndex={0}
      className="inline-flex cursor-pointer select-text items-center rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-medium text-foreground hover:bg-neutral-200"
      title="Click to copy"
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
    >
      {displayValue ?? constraintValueDisplay(value)}
    </span>
  );
}

function AdditionalPropertiesConstraint({ schema }: { schema: SchemaNodeData }) {
  const additionalProperties = getAdditionalPropertiesSchema(schema);
  if (typeof additionalProperties !== "boolean") return null;
  return (
    <Label>
      {additionalProperties
        ? "additional properties allowed"
        : "additional properties not allowed"}
    </Label>
  );
}

function PropertyNamesConstraint({ schema }: { schema: SchemaNodeData }) {
  const propertyNames = getPropertyNamesSchema(schema);
  if (typeof propertyNames === "boolean") {
    return (
      <Pill>{propertyNames ? "any property name" : "no property names"}</Pill>
    );
  }
  if (
    propertyNames !== null &&
    isSchemaRecord(propertyNames) &&
    isLeafItemSchema(propertyNames) &&
    typeof propertyNames.pattern === "string" &&
    propertyNames.pattern.length > 0
  ) {
    return (
      <span className="inline-flex items-center gap-1">
        <Label>property name pattern:</Label>
        <CopyablePill value={propertyNames.pattern} displayValue={propertyNames.pattern} />
      </span>
    );
  }
  return null;
}

function ConstraintFields({
  schema,
  rangeName = "value",
}: {
  schema: SchemaNodeData;
  rangeName?: string;
}) {
  const enumValues =
    Array.isArray(schema.enum) && schema.enum.length > 0 ? schema.enum : null;
  const numericLower = getLowerBound(schema);
  const numericUpper = getUpperBound(schema);
  const lengthLower = getLengthLowerBound(schema);
  const lengthUpper = getLengthUpperBound(schema);
  const itemsLower = getCountLowerBound(schema, "minItems");
  const itemsUpper = getCountUpperBound(schema, "maxItems");
  const propsLower = getCountLowerBound(schema, "minProperties");
  const propsUpper = getCountUpperBound(schema, "maxProperties");

  return (
    <>
      {typeof schema.multipleOf === "number" && (
        <span className="inline-flex items-center gap-1">
          <Label>multiple of :</Label>
          <Pill>{String(schema.multipleOf)}</Pill>
        </span>
      )}
      {(numericLower || numericUpper) && (
        <ValueRange
          name={rangeName}
          lower={numericLower}
          upper={numericUpper}
        />
      )}
      {(lengthLower || lengthUpper) && (
        <ValueRange
          name={rangeName}
          lower={lengthLower}
          upper={lengthUpper}
          suffix="chars"
        />
      )}
      {(itemsLower || itemsUpper) && (
        <ValueRange
          name={rangeName}
          lower={itemsLower}
          upper={itemsUpper}
          suffix="items"
        />
      )}
      {(propsLower || propsUpper) && (
        <ValueRange
          name={rangeName}
          lower={propsLower}
          upper={propsUpper}
          suffix="props"
        />
      )}
      {typeof schema.pattern === "string" && schema.pattern.length > 0 && (
        <span className="inline-flex items-center gap-1">
          <Label>regex pattern:</Label>
          <CopyablePill value={schema.pattern} displayValue={schema.pattern} />
        </span>
      )}
      {enumValues && (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Label>enum values:</Label>
          {enumValues.map((value, index) => (
            <CopyablePill key={`${index}-${constraintValueDisplay(value)}`} value={value} />
          ))}
        </span>
      )}
      {schema.const !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Label>const value:</Label>
          <CopyablePill value={schema.const} />
        </span>
      )}
      {schema.uniqueItems === true && <Label>unique</Label>}
      <AdditionalPropertiesConstraint schema={schema} />
      <PropertyNamesConstraint schema={schema} />
    </>
  );
}

/** Renders validation constraints read directly from the schema. */
export default function SchemaConstraints({
  schema,
  itemSchema,
  fieldName,
  className = "flex flex-col gap-1",
}: SchemaConstraintsProps) {
  const showItemConstraints =
    itemSchema !== null &&
    itemSchema !== undefined &&
    isLeafItemSchema(itemSchema);
  const rangeName = fieldName ?? "value";

  return (
    <div className={className}>
      <ConstraintFields schema={schema} rangeName={rangeName} />
      {showItemConstraints && (
        <ConstraintFields schema={itemSchema} rangeName="item" />
      )}
    </div>
  );
}
