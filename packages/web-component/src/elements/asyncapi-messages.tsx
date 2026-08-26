import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { Messages } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiMessagesElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
}

export function AsyncApiMessagesElement({ spec, config, layout }: AsyncApiMessagesElementProps) {
  if (!spec) return null;
  return <Messages document={spec} config={config} layout={layout} />;
}

defineOnce(
  "apiuikit-asyncapi-messages",
  r2wc(AsyncApiMessagesElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
    },
  }),
);
