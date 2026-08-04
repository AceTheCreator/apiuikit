import type { Meta, StoryObj } from "@storybook/react";
import Authorization from "../components/Authorization";
import { centeredDecorator } from "./documentContextDecorator";

// Authorization is a pure presentational component (no document context) that
// renders one tab per declared security scheme, with a different body per
// type: OAuth2 shows its flows/scopes, API key shows placement guidance,
// X.509/SASL show static instructions, OpenID links its discovery URL. These
// stories exercise that per-type rendering, which is otherwise only reachable
// by finding a spec that happens to declare each scheme.
type Securities = Parameters<typeof Authorization>[0]["securities"];

const oauth2 = {
  type: "oauth2",
  description: "OAuth 2.0 authentication for the development environment",
  flows: {
    authorizationCode: {
      authorizationUrl: "https://auth.example.com/oauth/authorize",
      tokenUrl: "https://auth.example.com/oauth/token",
      refreshUrl: "https://auth.example.com/oauth/refresh",
      availableScopes: {
        publish: "Permission to publish messages",
        subscribe: "Permission to subscribe to messages",
        manage: "Permission to manage the resource",
      },
    },
  },
};

const apiKey = {
  type: "apiKey",
  in: "user",
  description: "Provide your API key as the user name and leave the password empty.",
};

const openIdConnect = {
  type: "openIdConnect",
  openIdConnectUrl: "https://auth.example.com/.well-known/openid-configuration",
  scopes: ["publish", "subscribe"],
};

const x509 = {
  type: "X509",
  description: "Download the certificate files from the service provider.",
};

const userPassword = {
  type: "userPassword",
  description: "Provide the user and password issued for this broker.",
};

const meta = {
  title: "Internal/Authorization",
  component: Authorization,
  decorators: [centeredDecorator],
} satisfies Meta<typeof Authorization>;

export default meta;
type Story = StoryObj<typeof meta>;

// Multiple schemes → one tab each; switch tabs to see each body.
export const MultipleSchemes: Story = {
  args: {
    securities: [oauth2, apiKey, openIdConnect, x509, userPassword] as unknown as Securities,
  },
};

export const OAuth2: Story = {
  args: {
    securities: [oauth2] as unknown as Securities,
  },
};

export const ApiKey: Story = {
  args: {
    securities: [apiKey] as unknown as Securities,
  },
};

export const OpenIdConnect: Story = {
  args: {
    securities: [openIdConnect] as unknown as Securities,
  },
};
