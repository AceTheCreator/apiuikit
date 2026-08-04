import { HttpMethod, OpenAPIParameterData } from "./types/openapi";
import { OperationAction } from "./types/asyncapi/OperationAction";

export const CONTACT_TEXT = "Contact";
export const NAM_TEXT = "Name";
export const URL_TEXT = "Url";
export const EMAIL_TEXT = "Email";
export const LICENSE_TEXT = "License";
export const TERMS_OF_SERVICE_TEXT = "Terms of service";
export const URL_SUPPORT_TEXT = "Support";
export const EMAIL_SUPPORT_TEXT = "Email support";
export const EXTERNAL_DOCUMENTATION_TEXT = "External Documentation";
export const TAGS_TEXT = "Tags";
export const IMPLICIT_TEXT = "Implicit";
export const IMPLICIT_DESCRIPTION = `The Implicit flow is a simplified OAuth flow previously recommended
          for native apps and JavaScript apps where the access token is returned
          immediately without an extra authorization code exchange step.`;
export const CLIENT_CREDENTIALS_TEXT = "Client Credentials";
export const CLIENT_CREDENTIALS_DESCRIPTION =
  "The Client Credentials grant type is used by clients to obtain an access token outside of the context of a user.";
export const PASSWORD_TEXT = "Password";
export const PASSWORD_DESCRIPTION =
  "The Password grant type is a legacy way to exchange a user's credentials for an access token.";
export const AUTHORIZATION_CODE_TEXT = "Authorization Code";
export const AUTHORIZATION_CODE_DESCRIPTION =
  "The Authorization Code grant type is used by confidential and public clients to exchange an authorization code for an access token.";
export const SERVER_TEXT = "Connecting to a server";
export const Operation_TEXT = "";
export const chunkColors = [
  "text-blue-600",
  "text-indigo-600",
  "text-purple-600",
  "text-pink-600",
  "text-green-700",
];

export const SHADES = [50, 100, 200, 300, 500, 600, 700] as const;

export const PROTOCOL_META: Record<string, { label: string; color: string }> = {
  kafka: {
    label: "Kafka",
    color: "bg-primary-100 text-primary-700 border-primary-200",
  },
  mqtt: {
    label: "MQTT",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  http: { label: "HTTP", color: "bg-blue-100 text-blue-700 border-blue-200" },
  https: { label: "HTTPS", color: "bg-blue-100 text-blue-700 border-blue-200" },
  ws: {
    label: "WebSocket",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  wss: {
    label: "WebSocket Secure",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  amqp: {
    label: "AMQP",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  amqps: {
    label: "AMQPS",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  ibmmq: {
    label: "IBM MQ",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  solace: {
    label: "Solace",
    color: "bg-pink-100 text-pink-700 border-pink-200",
  },
  nats: { label: "NATS", color: "bg-teal-100 text-teal-700 border-teal-200" },
};

export const PARAMETER_GROUPS: Array<{ location: OpenAPIParameterData["in"]; label: string }> = [
  { location: "path", label: "Path Parameters" },
  { location: "query", label: "Query Parameters" },
  { location: "header", label: "Header Parameters" },
  { location: "cookie", label: "Cookie Parameters" },
];

// HttpMethod (OpenAPI) and OperationAction (AsyncAPI) are disjoint string
// literal sets ("get"|"post"|... vs "send"|"receive"), so one color map
// keyed by their union covers both without any ambiguity.
export const METHOD_BADGE_COLOR_CLASSNAME: Record<HttpMethod | OperationAction, string> = {
  get: "bg-blue-100 text-blue-800",
  post: "bg-green-100 text-green-800",
  put: "bg-yellow-100 text-yellow-800",
  patch: "bg-orange-100 text-orange-800",
  delete: "bg-red-100 text-red-800",
  options: "bg-neutral-100 text-foreground-secondary",
  head: "bg-neutral-100 text-foreground-secondary",
  trace: "bg-neutral-100 text-foreground-secondary",
  [OperationAction.SEND]: "bg-green-100 text-green-800",
  [OperationAction.RECEIVE]: "bg-blue-100 text-blue-800",
};
