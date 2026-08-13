import r2wc from "@r2wc/react-to-web-component";
import "apiuikit/style.css";
import { AsyncApiElement, AsyncApiRendererElement, OpenApiElement, OpenApiRendererElement } from "./adapters";
import { defineOnce } from "./registerElement";

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

defineOnce(
  "apiuikit-asyncapi-renderer",
  r2wc(AsyncApiRendererElement, {
    props: {
      spec: "string",
      config: "json",
      onDiagnostics: undefined,
    },
  }),
);

defineOnce(
  "apiuikit-openapi",
  r2wc(OpenApiElement, {
    props: {
      spec: undefined,
      resolved: "boolean",
      config: "json",
    },
  }),
);

defineOnce(
  "apiuikit-openapi-renderer",
  r2wc(OpenApiRendererElement, {
    props: {
      spec: "string",
      config: "json",
      onDiagnostics: undefined,
    },
  }),
);
