import {useEffect, useState} from "react";
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
        // Load the relatively large faker only when the Example tab actually
        // needs a synthetic value. Author-provided examples need no download.
        import("json-schema-faker")
            .then(({ generate }) => generate(
                extendExampleSchema(schema, deref),
                { seed: 42, useExamplesValue: true, optionalsProbability: 1 },
            ))
                .then((result) => {
                    if (!cancelled) setValue(result);
                })
                .catch(() => undefined);
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
