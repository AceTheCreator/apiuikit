import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { AsyncAPIInfo } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiInfoElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function AsyncApiInfoElement({ spec, config, layout }: AsyncApiInfoElementProps) {
  if (!spec) return null;
  return <AsyncAPIInfo document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-asyncapi-info",
  r2wc(AsyncApiInfoElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
