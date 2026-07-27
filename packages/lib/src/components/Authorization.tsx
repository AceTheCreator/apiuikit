import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Tabs from "./Tabs";
import Markdown from "./Markdown";
import { UserPassword } from "../types/asyncapi/UserPassword";
import { ApiKey as ApiKeyType } from "../types/asyncapi/ApiKey";
import { X509 } from "../types/asyncapi/X509";
import { SymmetricEncryption } from "../types/asyncapi/SymmetricEncryption";
import { AsymmetricEncryption } from "../types/asyncapi/AsymmetricEncryption";
import { BearerHttpSecurityScheme } from "../types/asyncapi/BearerHttpSecurityScheme";
import { ApiKeyHttpSecurityScheme } from "../types/asyncapi/ApiKeyHttpSecurityScheme";
import { Oauth2Flows } from "../types/asyncapi/Oauth2Flows";
import { OpenIdConnect } from "../types/asyncapi/OpenIdConnect";
import { SaslPlainSecurityScheme } from "../types/asyncapi/SaslPlainSecurityScheme";
import { SaslScramSecurityScheme } from "../types/asyncapi/SaslScramSecurityScheme";
import { SaslGssapiSecurityScheme } from "../types/asyncapi/SaslGssapiSecurityScheme";
import { formatArrayToCodeString } from "../helpers/formatEnumDescription";
import {
  AUTHORIZATION_CODE_DESCRIPTION,
  AUTHORIZATION_CODE_TEXT,
  CLIENT_CREDENTIALS_DESCRIPTION,
  CLIENT_CREDENTIALS_TEXT,
  IMPLICIT_DESCRIPTION,
  IMPLICIT_TEXT,
  PASSWORD_DESCRIPTION,
  PASSWORD_TEXT,
} from "../contants";

type SecurityScheme =
  | UserPassword
  | ApiKeyType
  | X509
  | SymmetricEncryption
  | AsymmetricEncryption
  | BearerHttpSecurityScheme
  | ApiKeyHttpSecurityScheme
  | Oauth2Flows
  | OpenIdConnect
  | SaslPlainSecurityScheme
  | SaslScramSecurityScheme
  | SaslGssapiSecurityScheme;

const tabs = [
  { id: "userPassword", name: "User/Password" },
  { id: "oauth2", name: "OAuth2" },
  { id: "apiKey", name: "API key" },
  { id: "openIdConnect", name: "OpenID" },
  { id: "X509", name: "X.509 certificate" },
  { id: "scramSha256", name: "SASL" },
  { id: "scramSha512", name: "SASL" },
  { id: "plain", name: "SASL" },
  { id: "gssapi", name: "SASL" },
];

interface Props {
  securities: SecurityScheme[];
}

export default function Authorization({ securities }: Props) {
  // Security scheme $refs are already inlined by resolveDocument /
  // @asyncapi/parser before the document reaches any component.
  const filteredTabs = useMemo(() => {
    return tabs.filter((tab) => {
      const tabId = tab.id;
      return securities?.some(
        (security: SecurityScheme) =>
          security.type.toLowerCase() === tabId.toLowerCase()
      );
    });
  }, [securities]);
  const [authTab, setAuthTab] = useState(
    filteredTabs.length > 0 ? filteredTabs[0].id : null
  );

  useEffect(() => {
    if (filteredTabs.length > 0) {
      setAuthTab(filteredTabs[0].id);
    }
  }, [filteredTabs]);

  function filteredType<T extends SecurityScheme>(type: string): T {
    return securities.find((security) => security.type === type) as T;
  }

  const activeDescription = authTab ? filteredType<SecurityScheme>(authTab)?.description : undefined;

  return (
    <div>
      {filteredTabs.length > 1 && (
        <Tabs tabs={filteredTabs} current={authTab} onChange={setAuthTab} />
      )}
      <div className="py-4 prose text-foreground-muted">
        {authTab === "userPassword" && (
          <AuthDescription>
            You have to{" "}
            <strong className="text-foreground-secondary">
              provide user and password
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {authTab && ["scramSha256", "scramSha512", "plain"].includes(authTab) && (
          <AuthDescription description={activeDescription}>
            You have to{" "}
            <strong className="text-foreground-secondary">
              provide username and password
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {authTab === "gssapi" && (
          <AuthDescription>
            You have to{" "}
            <strong className="text-foreground-secondary">
              authenticate using Kerberos (GSSAPI)
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {authTab === "X509" && (
          <AuthDescription>
            You have to{" "}
            <strong className="text-foreground-secondary">
              download the certificate file
            </strong>{" "}
            from the service provider to connect to this server.
          </AuthDescription>
        )}
        {authTab === "apiKey" && (
          <ApiKey security={filteredType<ApiKeyType>("apiKey")} />
        )}
        {authTab === "openIdConnect" && (
          <OpenID security={filteredType<OpenIdConnect>("openIdConnect")} />
        )}
        {authTab === "oauth2" && (
          <OAuth2 security={filteredType<Oauth2Flows>("oauth2")} />
        )}
      </div>
    </div>
  );
}

// Renders the security scheme's own `description` (if the document provides one) instead
// of the generic fallback copy — author-supplied docs should win over our boilerplate.
const AuthDescription = ({ description, children }: { description?: string; children: ReactNode }) => {
  if (description) return (
    <>
      <Markdown>{description}</Markdown>
    </>
  );
  return <span>{children}</span>;
};

export const ApiKey = ({ security }: { security: ApiKeyType }) => {
  if (security?.description) return <Markdown>{security.description}</Markdown>;

  const keyLocation = security?.in;
  if (keyLocation === "password") {
    return (
      <span>
        You have to{" "}
        <strong className="text-foreground-secondary">
          provide your API key as the password and leave the user name empty
        </strong>{" "}
        to connect to this server.
      </span>
    );
  }
  return (
    <span>
      You have to{" "}
      <strong className="text-foreground-secondary">
        provide your API key as the user name and leave the password empty
      </strong>{" "}
      to connect to this server.
    </span>
  );
};

export const OpenID = ({ security }: { security: OpenIdConnect }) => {
  return (
    <>
      {security?.description ? (
        <Markdown>{security.description}</Markdown>
      ) : (
        <p>You can use OpenID to connect to this server.</p>
      )}
      <p>
        The OpenID Connect URL is{" "}
        <a href={security.openIdConnectUrl} target="_blank" rel="noreferrer">
          {security.openIdConnectUrl}
        </a>
        .
      </p>
      {security?.scopes && (
        <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 items-center @sm:gap-4">
          <dt className="text-sm font-medium text-foreground-muted">Scopes</dt>
          <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
            <code>{formatArrayToCodeString(security.scopes)}</code>
          </dd>
        </div>
      )}
    </>
  );
};

export const OAuth2 = ({ security }: { security: Oauth2Flows }) => {
  const flows = security?.flows;
  return (
    <>
      {security?.description && <Markdown>{security.description}</Markdown>}
      {flows &&
        Object.entries(flows).map(([flow, flowData]) => {
          let title = "";
          let description = "";
          switch (flow) {
            case "clientCredentials":
              title = CLIENT_CREDENTIALS_TEXT;
              description = CLIENT_CREDENTIALS_DESCRIPTION;
              break;
            case "implicit":
              title = IMPLICIT_TEXT;
              description = IMPLICIT_DESCRIPTION;
              break;
            case "password":
              title = PASSWORD_TEXT;
              description = PASSWORD_DESCRIPTION;
              break;
            case "authorizationCode":
              title = AUTHORIZATION_CODE_TEXT;
              description = AUTHORIZATION_CODE_DESCRIPTION;
              break;
          }
          return (
            <div key={flow}>
              <div>
                <h4 className="text-lg leading-6 font-bold text-foreground">
                  {title}
                </h4>
                <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
                  {description}
                </p>
              </div>
              <div className="mt-5 border-t border-border">
                <dl className="@sm:divide-y @sm:divide-border">
                  {flowData.authorizationUrl && (
                    <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 @sm:gap-4 items-center">
                      <dt className="text-sm font-medium text-foreground-muted">
                        Authorization URL
                      </dt>
                      <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
                        <a href={flowData.authorizationUrl} target="_blank" rel="noreferrer" className="text-foreground">
                          {flowData.authorizationUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  {flowData.tokenUrl && (
                    <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 @sm:gap-4 items-center">
                      <dt className="text-sm font-medium text-foreground-muted">
                        Token URL
                      </dt>
                      <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
                        <a href={flowData.tokenUrl} target="_blank" rel="noreferrer" className="text-foreground">
                          {flowData.tokenUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  {flowData.refreshUrl && (
                    <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 @sm:gap-4 items-center">
                      <dt className="text-sm font-medium text-foreground-muted">
                        Refresh URL
                      </dt>
                      <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
                        <a href={flowData.refreshUrl} target="_blank" rel="noreferrer" className="text-foreground">
                          {flowData.refreshUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  {flowData.availableScopes && (
                    <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 @sm:gap-4 items-center">
                      <dt className="text-sm font-medium text-foreground-muted">
                        Scopes
                      </dt>
                      <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(flowData.availableScopes)
                            ? flowData.availableScopes
                            : Object.keys(flowData.availableScopes)
                          ).map((scope: string) => (
                            <code
                              key={scope}
                              className="text-xs bg-neutral-100 text-foreground-secondary px-1.5 py-0.5 rounded"
                            >
                              {scope}
                            </code>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          );
        })}
    </>
  );
};
