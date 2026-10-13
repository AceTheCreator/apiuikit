import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { AsyncAPIOperation } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiOperationElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
  operationId?: string;
}

export function AsyncApiOperationElement({ spec, config, layout, operationId }: AsyncApiOperationElementProps) {
  if (!spec || !operationId) return null;
  return <AsyncAPIOperation document={spec} config={config} layout={layout} operationId={operationId} />;
}

defineOnce(
  "apiuikit-asyncapi-operation",
  r2wc(AsyncApiOperationElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
      operationId: "string",
    },
  }),
);
