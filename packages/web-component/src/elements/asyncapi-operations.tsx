import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Operations } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiOperationsElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function AsyncApiOperationsElement({ spec, config, layout }: AsyncApiOperationsElementProps) {
  if (!spec) return null;
  return <Operations document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-asyncapi-operations",
  r2wc(AsyncApiOperationsElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
