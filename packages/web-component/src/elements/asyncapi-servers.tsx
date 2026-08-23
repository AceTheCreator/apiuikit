import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Servers } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiServersElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function AsyncApiServersElement({ spec, config, layout }: AsyncApiServersElementProps) {
  if (!spec) return null;
  return <Servers document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-asyncapi-servers",
  r2wc(AsyncApiServersElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
