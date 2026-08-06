import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Tabs from "./Tabs";
import Markdown from "./Markdown";
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

// Structurally compatible with both AsyncAPI's several security scheme types
// (UserPassword, ApiKey, X509, ..., BearerHttpSecurityScheme,
// ApiKeyHttpSecurityScheme, Oauth2Flows, OpenIdConnect, the Sasl* schemes) and
// OpenAPI's SecuritySchemeObject union — each spec's actual scheme is a
// superset of what's read here, so this component and its sub-components
// work for either without callers casting. The two specs differ in a few
// spots handled explicitly below rather than papered over:
//  - `in`: AsyncAPI's broker-style ApiKey uses "user"|"password" (which
//    connection field carries the key); OpenAPI's ApiKey (and AsyncAPI's own
//    httpApiKey) uses "header"|"query"|"cookie" (which request parameter
//    does) — genuinely different placements, not just a naming difference.
//  - OAuth2 flow scopes: AsyncAPI names the field `availableScopes`, OpenAPI
//    names it `scopes` — read as a fallback chain.
// Not `extends Record<string, unknown>` — this component only ever reads
// named fields, never a dynamic string key, and requiring an index signature
// would reject named interfaces like openapi-types' `HttpSecurityScheme`
// (real security scheme objects, no index signature of their own) even
// though they satisfy every field below structurally.
export interface SecuritySchemeData {
  type: string;
  description?: string;
  in?: string;
  /** The header/query/cookie parameter name — OpenAPI's apiKey / AsyncAPI's httpApiKey. */
  name?: string;
  /** The `http` scheme, e.g. "bearer" | "basic". */
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  scopes?: string[];
  /** The scopes a specific security *requirement* actually asks for (set by the caller when it's resolving one operation's requirement, not the scheme definition itself) — preferred over the scheme's full scope catalog when present, since a requirement is usually only asking for a subset of it. */
  requiredScopes?: string[];
  flows?: Record<
    string,
    {
      authorizationUrl?: string;
      tokenUrl?: string;
      refreshUrl?: string;
      availableScopes?: string[] | Record<string, string>;
      scopes?: Record<string, string>;
    }
  >;
}

/** Display name per scheme kind. Several SASL types deliberately share one. */
const KIND_LABELS: Record<string, string> = {
  userPassword: "User/Password",
  oauth2: "OAuth2",
  apiKey: "API key",
  bearer: "Bearer Token",
  openIdConnect: "OpenID",
  X509: "X.509 certificate",
  scramSha256: "SASL",
  scramSha512: "SASL",
  plain: "SASL",
  gssapi: "SASL",
};

/**
 * Which tab a scheme belongs to. Most types map onto a tab id directly
 * (case-insensitively) — `http` and AsyncAPI's `httpApiKey` are the two
 * spots that need translating onto an existing (or the new `bearer`) tab.
 */
function tabIdFor(scheme: SecuritySchemeData): string {
  const type = scheme.type?.toLowerCase();
  if (type === "httpapikey") return "apiKey";
  if (type === "http") {
    const httpScheme = scheme.scheme?.toLowerCase();
    if (httpScheme === "basic") return "userPassword";
    if (httpScheme?.includes("mutual") || httpScheme?.includes("tls")) return "X509";
    return "bearer";
  }
  return scheme.type;
}

/** One tab: a single declared scheme, not a scheme *kind*. */
interface AuthMethod {
  id: string;
  name: string;
  /** Which kind's content to render, from `tabIdFor`. */
  kind: string;
  scheme: SecuritySchemeData;
}

/**
 * The detail that tells two same-kind schemes apart in a tab label: the
 * header/query parameter name for API keys, the HTTP scheme or bearer format
 * for `http`, and the raw type for the SASL family (which shares one label).
 */
function disambiguator(scheme: SecuritySchemeData): string | undefined {
  return scheme.name || scheme.scheme || scheme.bearerFormat || scheme.type || undefined;
}

/**
 * One method per declared scheme, in document order.
 *
 * Schemes are *not* collapsed by kind: a document can legitimately declare
 * several of the same kind (two `httpApiKey` schemes for different headers,
 * say), and each is a distinct way to authenticate that the reader needs to
 * see. Labels stay the plain kind name while they're unique, and only pick up
 * a disambiguating suffix where they'd otherwise collide, so the common
 * single-scheme case reads exactly as before.
 *
 * Kinds with no content renderer are dropped rather than shown as an empty
 * tab, matching what this component has always displayed.
 */
function buildAuthMethods(securities: SecuritySchemeData[] | undefined): AuthMethod[] {
  const renderable = (securities ?? []).filter((scheme) => KIND_LABELS[tabIdFor(scheme)]);

  const labelCounts = new Map<string, number>();
  for (const scheme of renderable) {
    const label = KIND_LABELS[tabIdFor(scheme)];
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const usedNames = new Set<string>();
  return renderable.map((scheme, index) => {
    const kind = tabIdFor(scheme);
    const label = KIND_LABELS[kind];
    const detail = (labelCounts.get(label) ?? 0) > 1 ? disambiguator(scheme) : undefined;

    let name = detail ? `${label} (${detail})` : label;
    // Two schemes of one kind with nothing to tell them apart: number them so
    // the tabs are at least addressable.
    if (usedNames.has(name)) name = `${name} #${index + 1}`;
    usedNames.add(name);

    return { id: `${kind}-${index}`, name, kind, scheme };
  });
}

interface Props {
  securities: SecuritySchemeData[];
}

export default function Authorization({ securities }: Props) {
  // Security scheme $refs are already inlined by resolveDocument /
  // @asyncapi/parser / @scalar/openapi-parser before the document reaches any component.
  const methods = useMemo(() => buildAuthMethods(securities), [securities]);
  const isMultiMethod = methods.length > 1;
  // Single method: show content immediately. Multiple: nothing selected until
  // the user picks a tab — then they can close the panel back up.
  const [authTab, setAuthTab] = useState<string | null>(
    isMultiMethod ? null : methods[0]?.id ?? null
  );

  useEffect(() => {
    if (methods.length === 0) {
      setAuthTab(null);
      return;
    }
    if (methods.length === 1) {
      setAuthTab(methods[0].id);
      return;
    }
    setAuthTab((current) =>
      current && methods.some((method) => method.id === current) ? current : null
    );
  }, [methods]);

  // The selected scheme itself, so content renders the scheme the reader
  // picked rather than the first one of its kind.
  const active = methods.find((method) => method.id === authTab);
  const activeKind = active?.kind;
  const activeScheme = active?.scheme;
  const activeDescription = activeScheme?.description;

  return (
    <div>
      {isMultiMethod && (
        <Tabs
          tabs={methods}
          current={authTab}
          onChange={(id) =>
            setAuthTab((current) => (id && current === id ? null : id || null))
          }
          placeholder="Select an authorization method"
        />
      )}
      <div className="py-4 prose text-foreground-muted">
        {activeKind === "userPassword" && (
          <AuthDescription description={activeDescription}>
            You have to{" "}
            <strong className="text-foreground-secondary">
              provide user and password
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {activeKind && ["scramSha256", "scramSha512", "plain"].includes(activeKind) && (
          <AuthDescription description={activeDescription}>
            You have to{" "}
            <strong className="text-foreground-secondary">
              provide username and password
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {activeKind === "gssapi" && (
          <AuthDescription description={activeDescription}>
            You have to{" "}
            <strong className="text-foreground-secondary">
              authenticate using Kerberos (GSSAPI)
            </strong>{" "}
            to connect to this server.
          </AuthDescription>
        )}
        {activeKind === "X509" && (
          <AuthDescription description={activeDescription}>
            You have to{" "}
            <strong className="text-foreground-secondary">
              download the certificate file
            </strong>{" "}
            from the service provider to connect to this server.
          </AuthDescription>
        )}
        {activeKind === "bearer" && (
          <Bearer security={activeScheme!} />
        )}
        {activeKind === "apiKey" && (
          <ApiKey security={activeScheme!} />
        )}
        {activeKind === "openIdConnect" && (
          <OpenID security={activeScheme!} />
        )}
        {activeKind === "oauth2" && (
          <OAuth2 security={activeScheme!} />
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

export const Bearer = ({ security }: { security: SecuritySchemeData }) => {
  if (security?.description) return <Markdown>{security.description}</Markdown>;

  return (
    <span>
      You have to{" "}
      <strong className="text-foreground-secondary">
        provide a bearer token
      </strong>{" "}
      in the <code>Authorization</code> header
      {security?.bearerFormat ? <> (format: {security.bearerFormat})</> : null} to connect to this server.
    </span>
  );
};

export const ApiKey = ({ security }: { security: SecuritySchemeData }) => {
  if (security?.description) return <Markdown>{security.description}</Markdown>;

  const keyLocation = security?.in;

  // OpenAPI's apiKey / AsyncAPI's httpApiKey — the key travels as an actual
  // HTTP request parameter, not as a broker connection credential.
  if (keyLocation === "header" || keyLocation === "query" || keyLocation === "cookie") {
    return (
      <span>
        You have to{" "}
        <strong className="text-foreground-secondary">
          provide your API key in the {keyLocation} parameter
          {security?.name ? <> named <code>{security.name}</code></> : null}
        </strong>{" "}
        to connect to this server.
      </span>
    );
  }

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

export const OpenID = ({ security }: { security: SecuritySchemeData }) => {
  // Prefer the scopes this specific requirement asks for over the scheme's
  // own catalog — OpenAPI's OpenID scheme doesn't even carry its own scopes
  // list, so `requiredScopes` (set by the caller resolving one operation's
  // requirement) is often the only scope info available at all here.
  const scopesValue = security.requiredScopes?.length ? security.requiredScopes : security.scopes;
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
      {scopesValue && scopesValue.length > 0 && (
        <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 items-center @sm:gap-4">
          <dt className="text-sm font-medium text-foreground-muted">
            {security.requiredScopes?.length ? "Required scopes" : "Scopes"}
          </dt>
          <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
            <code>{formatArrayToCodeString(scopesValue)}</code>
          </dd>
        </div>
      )}
    </>
  );
};

export const OAuth2 = ({ security }: { security: SecuritySchemeData }) => {
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
          // Prefer the scopes this specific requirement asks for over the
          // flow's full catalog — a requirement is usually only asking for a
          // subset of what the scheme makes available. AsyncAPI names the
          // catalog field `availableScopes`, OpenAPI names it `scopes`.
          const scopesValue = security.requiredScopes?.length
            ? security.requiredScopes
            : flowData.availableScopes ?? flowData.scopes;
          const scopesLabel = security.requiredScopes?.length ? "Required scopes" : "Available scopes";
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
                  {scopesValue && (
                    <div className="py-4 @sm:py-5 @sm:grid @sm:grid-cols-3 @sm:gap-4 items-center">
                      <dt className="text-sm font-medium text-foreground-muted">
                        {scopesLabel}
                      </dt>
                      <dd className="mt-1 text-sm text-foreground @sm:mt-0 @sm:col-span-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(scopesValue)
                            ? scopesValue
                            : Object.keys(scopesValue)
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
