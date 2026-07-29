import {useEffect, useState} from "react";
import { CodeBlock } from "./CodeBlock";
import { generateSchemaExample, type JsonSchema } from "../helpers/schemaExample";

interface ExamplesProps {
    schema: JsonSchema;
}

export function Examples ({schema}: ExamplesProps) {
    const [value, setValue] = useState<unknown>(null);

    useEffect(() => {
        let cancelled = false;
        generateSchemaExample(schema).then((result) => {
            if (!cancelled && result !== undefined) setValue(result);
        });
        return () => {
            cancelled = true;
        };
    }, [schema]);

    if (value === null) return null;

    const json = JSON.stringify(value, null, 2);

    return (
      <div>
        <CodeBlock code={json} />
        <span className="text-xs text-foreground-muted italic mt-2 font-bold inline-block">
          This example is auto generated
        </span>
      </div>
    );
}
