import { ArazzoResultView, type ArazzoCommonProps } from "./Arazzo";
import { useArazzoModel } from "./useArazzoModel";

export interface ArazzoRendererProps extends ArazzoCommonProps {
  /** The Arazzo document as a YAML or JSON string. Parsing it needs `@usearazzo/parser` installed. */
  raw: string;
}

/**
 * The same full Arazzo page as Arazzo, starting from the document as text.
 * Pass `raw` a YAML or JSON string. A document that can't be read renders
 * nothing; `onDiagnostics` says why.
 */
export function ArazzoRenderer({ raw, ...props }: ArazzoRendererProps) {
  const result = useArazzoModel({ raw }, props, props.onDiagnostics);
  return <ArazzoResultView result={result} {...props} />;
}
