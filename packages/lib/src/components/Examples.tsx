import {useEffect, useState} from "react";
import {generate} from "json-schema-faker";
import { CodeBlock } from "./CodeBlock";
import { useAsyncAPIDocument } from "../contexts";
import { extendExampleSchema, JsonSchema } from "../helpers/exampleSchema";

interface ExamplesProps {
    schema: JsonSchema;
    /** A real example value declared in the spec (OpenAPI media type `example`/`examples`, or an AsyncAPI message example), shown as-is instead of auto-generating one when present. */
    providedExample?: unknown;
}

export function Examples ({schema, providedExample}: ExamplesProps) {
    const hasProvidedExample = providedExample !== undefined;
    const [value, setValue] = useState<unknown>(hasProvidedExample ? providedExample : null);
    // Leftover $ref nodes in the schema (resolveDocument's cycle cut-points)
    // resolve against the whole document, which only the context can reach.
    const { deref } = useAsyncAPIDocument();

    useEffect(() => {
        if (hasProvidedExample) {
            setValue(providedExample);
            return;
        }

        let cancelled = false;
        // Fail soft: circular or otherwise ungenerable schemas leave the tab
        // empty rather than crashing the render (generate can throw
        // synchronously or reject).
        try {
            generate(extendExampleSchema(schema, deref), { seed: 42, useExamplesValue: true, optionalsProbability: 1 })
                .then((result) => {
                    if (!cancelled) setValue(result);
                })
                .catch(() => undefined);
        } catch {
            // leave value as null
        }
        return () => {
            cancelled = true;
        };
    }, [schema, deref, hasProvidedExample, providedExample]);

    if (value === null) return null;

    const json = JSON.stringify(value, null, 2);

    return (
      <div>
        <CodeBlock code={json} />
        {!hasProvidedExample && (
          <span className="text-xs text-foreground-muted italic mt-2 font-bold inline-block">
            This example is auto generated
          </span>
        )}
      </div>
    );
}
