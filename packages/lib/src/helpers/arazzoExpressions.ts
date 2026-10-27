import type {
  ArazzoCriterion,
  ArazzoCriterionData,
  ArazzoDiagnostic,
  ArazzoExpression,
  ArazzoTextValue,
  ArazzoValue,
  CriterionConditionNode,
  RuntimeExpressionNode,
} from "../types/arazzo";

/*
 * Runtime expressions and criterion conditions, parsed with the grammar
 * packages `@usearazzo/parser` itself re-exports. They are small (~16 KB
 * gzipped together) regular dependencies, loaded lazily, so expressions parse
 * even when the document arrives pre-parsed and the Arazzo parser isn't
 * installed.
 */

export interface ExpressionParsers {
  expression(text: string): RuntimeExpressionNode | null;
  condition(text: string): CriterionConditionNode | null;
}

let loaded: Promise<ExpressionParsers> | null = null;

export function loadExpressionParsers(): Promise<ExpressionParsers> {
  loaded ??= Promise.all([
    import("@swaggerexpert/arazzo-runtime-expression"),
    import("@swaggerexpert/arazzo-criterion"),
  ]).then(([expressions, criteria]) => ({
    expression: (text) => {
      try {
        const { result, tree } = expressions.parse(text);
        return result.success ? tree : null;
      } catch {
        return null;
      }
    },
    condition: (text) => {
      try {
        const { result, tree } = criteria.parse(text);
        return result.success ? tree : null;
      } catch {
        return null;
      }
    },
  }));
  return loaded;
}

// A string that is meant to be a runtime expression, valid or not. Other
// strings starting with `$` (a price, a shell variable) stay literal.
const EXPRESSION_ATTEMPT = /^\$(url|method|statusCode|self|request|response|message|inputs|outputs|steps|workflows|sourceDescriptions|components)\b/;

// `{$...}` inside a string. Braces don't nest in runtime expressions.
const EMBEDDED_EXPRESSION = /\{(\$[^{}]+)\}/g;

const escapePointerToken = (token: string) => token.replace(/~/g, "~0").replace(/\//g, "~1");

/** Parses values for one document, collecting diagnostics for expressions that don't parse. */
export class ExpressionReader {
  constructor(
    private readonly parsers: ExpressionParsers,
    private readonly diagnostics: ArazzoDiagnostic[],
  ) {}

  expression(text: string, path: string[]): ArazzoExpression {
    const node = this.parsers.expression(text);
    if (!node) this.diagnostics.push({ message: `"${text}" is not a valid runtime expression.`, path, severity: 0 });
    return { text, node };
  }

  /** A value that may be, embed, or contain runtime expressions. */
  value(raw: unknown, path: string[]): ArazzoValue {
    if (typeof raw === "string") return this.text(raw, path) ?? { kind: "literal", raw };
    if (raw === null || typeof raw !== "object") return { kind: "literal", raw };

    const expressions: Array<{ pointer: string; value: ArazzoTextValue }> = [];
    const walk = (node: unknown, pointer: string, nodePath: string[]) => {
      if (typeof node === "string") {
        const value = this.text(node, nodePath);
        if (value) expressions.push({ pointer, value });
      } else if (node && typeof node === "object") {
        for (const [key, child] of Object.entries(node)) {
          walk(child, `${pointer}/${escapePointerToken(key)}`, [...nodePath, key]);
        }
      }
    };
    walk(raw, "", path);
    return expressions.length ? { kind: "structure", raw, expressions } : { kind: "literal", raw };
  }

  /** A runtime expression that must be one: an output value, a criterion context. */
  requiredExpression(raw: unknown, path: string[]): ArazzoValue {
    if (typeof raw === "string" && raw.startsWith("$")) {
      return { kind: "expression", raw, expression: this.expression(raw, path) };
    }
    return this.value(raw, path);
  }

  /** Reads a criterion object; fields of the wrong type were reported by validation and are read as absent. */
  criterion(data: Record<string, unknown>, path: string[]): ArazzoCriterion {
    const typeField = data.type as ArazzoCriterionData["type"] | undefined;
    const type = typeof typeField === "object" && typeField ? typeField.type : typeof typeField === "string" ? typeField : "simple";
    const version = typeof typeField === "object" && typeField ? typeField.version : undefined;
    const condition = typeof data.condition === "string" ? data.condition : "";
    const context = data.context === undefined ? undefined : this.requiredExpression(data.context, [...path, "context"]);

    const expressions: ArazzoExpression[] = [];
    if (context?.kind === "expression") expressions.push(context.expression);

    let conditionNode: CriterionConditionNode | null | undefined;
    if (type === "simple") {
      conditionNode = this.parsers.condition(condition);
      if (conditionNode) {
        collectConditionExpressions(conditionNode, expressions);
      } else {
        this.diagnostics.push({
          message: `"${condition}" is not a valid simple condition.`,
          path: [...path, "condition"],
          severity: 0,
        });
      }
    }

    return { type, version, condition, context, conditionNode, expressions, path };
  }

  private text(raw: string, path: string[]): ArazzoTextValue | null {
    if (EXPRESSION_ATTEMPT.test(raw)) {
      return { kind: "expression", raw, expression: this.expression(raw, path) };
    }
    if (!raw.includes("{$")) return null;

    const parts: Array<string | ArazzoExpression> = [];
    let last = 0;
    for (const match of raw.matchAll(EMBEDDED_EXPRESSION)) {
      const expression = this.expression(match[1], path);
      if (match.index > last) parts.push(raw.slice(last, match.index));
      parts.push(expression);
      last = match.index + match[0].length;
    }
    if (last === 0) return null;
    if (last < raw.length) parts.push(raw.slice(last));
    return { kind: "template", raw, parts };
  }
}

function collectConditionExpressions(node: CriterionConditionNode, into: ArazzoExpression[]) {
  switch (node.type) {
    case "RuntimeExpression":
      into.push({ text: node.text, node: node.expression });
      return;
    case "RuntimeExpressionNavigation":
      into.push({ text: node.expression.text, node: node.expression.expression });
      return;
    case "BinaryExpression":
    case "LogicalExpression":
      collectConditionExpressions(node.left, into);
      collectConditionExpressions(node.right, into);
      return;
    case "UnaryExpression":
      collectConditionExpressions(node.argument, into);
      return;
    default:
      return;
  }
}
