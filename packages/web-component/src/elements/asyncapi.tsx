import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import AsyncAPI from "apiuikit";
import type { ConfigInterface, AsyncAPIDocumentData } from "apiuikit";
import { defineOnce } from "../registerElement";

export interface AsyncApiElementProps {
  spec?: AsyncAPIDocumentData;
  resolved?: boolean;
  config?: ConfigInterface;
}

export function AsyncApiElement({ spec, resolved, config }: AsyncApiElementProps) {
  if (!spec) return null;
  return resolved ? (
    <AsyncAPI kind="resolved" asyncapi={spec} config={config} />
  ) : (
    <AsyncAPI asyncapi={spec} config={config} />
  );
}

defineOnce(
  "apiuikit-asyncapi",
  r2wc(AsyncApiElement, {
    props: {
      spec: undefined,
      resolved: "boolean",
      config: "json",
    },
  }),
);
