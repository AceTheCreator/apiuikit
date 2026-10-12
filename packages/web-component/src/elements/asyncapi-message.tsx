import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { AsyncAPIMessage } from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData, SectionLayout } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiMessageElementProps {
  spec?: AsyncAPIDocumentData;
  config?: ConfigInterface;
  layout?: SectionLayout;
  messageId?: string;
}

export function AsyncApiMessageElement({ spec, config, layout, messageId }: AsyncApiMessageElementProps) {
  if (!spec || !messageId) return null;
  return <AsyncAPIMessage document={spec} config={config} layout={layout} messageId={messageId} />;
}

defineOnce(
  "apiuikit-asyncapi-message",
  r2wc(AsyncApiMessageElement, {
    props: {
      spec: undefined,
      config: "json",
      layout: "string",
      messageId: "string",
    },
  }),
);
