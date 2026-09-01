import { lazy, Suspense, useEffect, useState } from "react";
import { SchemaTab } from "../../components/schema";
import Markdown from "../../components/Markdown";
import Tabs from "../../components/Tabs";
import Authorization from "../../components/Authorization";
import CollapsiblePanel from "../../components/CollapsiblePanel";
import IconExternalLink from "../../icons/ExternalLink";
import IconShieldCheck from "../../icons/ShieldCheck";
import { PARAMETER_GROUPS } from "../../contants";
import ResponseLinks from "./ResponseLinks";
import OperationCallbacks from "./OperationCallbacks";
import { PluginBoundary, PluginSlot, useOperationTabPlugins } from "../../plugins/PluginSlot";
import { useDocumentContext } from "../../contexts";
import {
  HttpMethod,
  OpenAPICallbackData,
  OpenAPIDocumentData,
  OpenAPIHeaderData,
  OpenAPILinkData,
  OpenAPIMediaTypeData,
  OpenAPIOperationData,
  OpenAPIParameterData,
  OpenAPIResponseData,
  OpenAPISecuritySchemeData,
} from "../../types/openapi";

const CodeSamples = lazy(() =>
  import("../../components/CodeSamples").then(({ CodeSamples }) => ({ default: CodeSamples })),
);

/** The parts of a response that can each have their own view: body schema, headers, and links. */
type ResponseSection = "body" | "headers" | "links";

// operationIds are conventionally PascalCase with no separators (e.g.
// "PostPaymentIntentsIntentCapture") — insert spaces between words so the
// lead-in sentence reads naturally instead of running them together.
function humanizeOperationId(operationId: string): string {
  return operationId
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

// The media type switch lives right in the SchemaTab's own heading — e.g.
// "Request Body (application/json)" — with the bracketed part becoming a
// real selector once there's more than one to choose from, instead of a
// separate control above the schema.
function MediaTypeLabel({
  prefix,
  mediaTypes,
  selected,
  onChange,
}: {
  prefix: string;
  mediaTypes: string[];
  selected: string;
  onChange: (mediaType: string) => void;
}) {
  if (mediaTypes.length <= 1) {
    return <>{mediaTypes[0] ? `${prefix} (${mediaTypes[0]})` : prefix}</>;
  }
  return (
    <>
      {prefix} (
      <select
        aria-label={`${prefix} media type`}
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent border-0 p-0 cursor-pointer underline decoration-dotted focus:outline-none"
      >
        {mediaTypes.map((mediaType) => (
          <option key={mediaType} value={mediaType}>
            {mediaType}
          </option>
        ))}
      </select>
      )
    </>
  );
}

// Prefers the media type's own declared `example`, then the first named
// `examples` entry's value (skipping unresolved $ref entries), over letting
// the Example tab fake-generate one from the schema.
function resolveMediaExample(media: OpenAPIMediaTypeData | undefined): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  const firstNamedExample = media.examples ? Object.values(media.examples)[0] : undefined;
  return firstNamedExample && "value" in firstNamedExample ? firstNamedExample.value : undefined;
}

function statusBadgeClassName(status: string): string {
  if (status.startsWith("2")) return "bg-green-100 text-green-800";
  if (status.startsWith("4") || status.startsWith("5")) return "bg-red-100 text-red-800";
  return "bg-neutral-100 text-foreground-secondary";
}

// Mirrors Reply's own request/reply tab strip (folder-style tabs sitting
// directly on top of a shared content panel) — one tab per response status,
// instead of stacking every status as its own bordered card.
function ResponseTabs({
  responses,
  onFollowOperation,
  isOperationKnown,
}: {
  responses: Record<string, OpenAPIResponseData>;
  onFollowOperation?: (operationId: string) => void;
  isOperationKnown?: (operationId: string) => boolean;
}) {
  const statuses = Object.keys(responses);
  const [status, setStatus] = useState(statuses[0]);
  const response = responses[status];
  const mediaTypes = Object.keys(response?.content ?? {});
  const [selectedMediaType, setSelectedMediaType] = useState(mediaTypes[0]);
  const activeMedia = selectedMediaType ? response?.content?.[selectedMediaType] : undefined;
  const headers = (response?.headers ?? {}) as Record<string, OpenAPIHeaderData>;
  const links = (response?.links ?? {}) as Record<string, OpenAPILinkData>;
  const [section, setSection] = useState<ResponseSection>("body");

  const hasBody = mediaTypes.length > 0 && !!activeMedia;
  const hasHeaders = Object.keys(headers).length > 0;
  const hasLinks = Object.keys(links).length > 0;

  // Same rule as MessageDetails' Payload/Headers switch: the tab strip only
  // appears when a response has more than one of these, and a lone one renders
  // on its own. Ordered body-first so the most-wanted view is the default.
  // `links` isn't among them: it describes a relationship to another
  // operation rather than a view of this response, so it reads as prose
  // below the content instead of competing for a tab.
  const availableSections = [
    ...(hasBody ? [{ id: "body" as const, name: "Body" }] : []),
    ...(hasHeaders ? [{ id: "headers" as const, name: "Headers" }] : []),
  ];
  const showSectionTabs = availableSections.length > 1;
  const currentSection = availableSections.some((s) => s.id === section)
    ? section
    : availableSections[0]?.id;
  // Nothing to collapse when a status declares neither a body nor headers
  // (a bare 204, say), so it says so plainly instead of offering an empty toggle.
  const hasDetail = availableSections.length > 0;

  // Different statuses can declare entirely different content types (and may
  // have no headers or links at all), so neither selection carries over on a
  // switch; `currentSection` clamps if "body" isn't among this status's.
  useEffect(() => {
    setSelectedMediaType(Object.keys(response?.content ?? {})[0]);
    setSection("body");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      {/* Statuses read as a row of their own badges rather than a second set
          of folder tabs: those belong to the Request/Response strip above, and
          nesting one inside the other reads as the same control twice. */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3" role="tablist" aria-label="Response status">
        {statuses.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono transition-all ${statusBadgeClassName(s)} ${
              status === s
                ? "ring-1 ring-inset ring-foreground-muted/40"
                : "opacity-50 hover:opacity-80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {response?.description && (
        <p className="text-sm text-foreground-secondary mb-3">{response.description}</p>
      )}

      {hasDetail ? (
        <>
          {showSectionTabs && (
            <Tabs
              tabs={availableSections}
              current={currentSection!}
              onChange={(id) => setSection(id as ResponseSection)}
            />
          )}
          <div className={showSectionTabs ? "mt-4" : undefined}>
            {/* Keyed per section: without distinct keys React reuses one
                SchemaTab across the swap and keeps its selected view, so the
                section's own `defaultView` would never apply after a switch. */}
            {currentSection === "headers" ? (
              <SchemaTab
                key="headers"
                schema={headersToSchema(headers)}
                label="Headers"
                rootName="Headers"
                defaultView="schema"
              />
            ) : (
              <SchemaTab
                key="body"
                schema={activeMedia?.schema ?? {}}
                label={
                  <MediaTypeLabel
                    prefix="Body"
                    mediaTypes={mediaTypes}
                    selected={selectedMediaType}
                    onChange={setSelectedMediaType}
                  />
                }
                rootName="Body"
                example={resolveMediaExample(activeMedia)}
              />
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-foreground-muted italic">No response body.</p>
      )}

      {hasLinks && (
        <ResponseLinks
          links={links}
          onFollowOperation={onFollowOperation}
          isOperationKnown={isOperationKnown}
        />
      )}
    </div>
  );
}

// A parameter or response-header group has no single schema of its own — each
// entry is its own little schema fragment. Bundling them as one synthetic
// object schema (one property per entry) lets the group render through
// SchemaTab exactly like a message's headers do in the AsyncAPI flow, instead
// of a bespoke table.
interface NamedSchemaField {
  name: string;
  schema?: unknown;
  description?: string;
  required?: boolean;
}

function fieldsToSchema(fields: NamedSchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    const schema = (field.schema as Record<string, unknown> | undefined) ?? {};
    properties[field.name] = {
      ...schema,
      description: schema.description ?? field.description,
    };
    if (field.required) required.push(field.name);
  }

  return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
}

const parametersToSchema = (parameters: OpenAPIParameterData[]) => fieldsToSchema(parameters);

// Response headers are keyed by name rather than carrying one, and `$ref`
// entries are already inlined by resolveDocument before this runs.
const headersToSchema = (headers: Record<string, OpenAPIHeaderData>) =>
  fieldsToSchema(Object.entries(headers).map(([name, header]) => ({ name, ...header })));

// Mirrors MessageDetails' own Payload/Headers switch: a tab per group that
// actually has parameters, shown only when there's more than one such group
// — a single group renders directly with no tab bar, same rule as there.
function ParameterGroups({ parameters }: { parameters: OpenAPIParameterData[] }) {
  const groups = PARAMETER_GROUPS.filter(({ location }) => parameters.some((p) => p.in === location));
  const [activeLocation, setActiveLocation] = useState<string | null>(groups[0]?.location ?? null);

  if (groups.length === 0) return null;

  const current = groups.some((g) => g.location === activeLocation) ? activeLocation! : groups[0].location!;
  const currentGroup = groups.find((g) => g.location === current)!;
  const schema = parametersToSchema(parameters.filter((param) => param.in === current));

  return (
    <div>
      {groups.length > 1 && (
        <Tabs
          tabs={groups.map(({ location, label }) => ({ id: location!, name: label.replace(/ Parameters$/, "") }))}
          current={current}
          onChange={setActiveLocation}
        />
      )}
      <div className={groups.length > 1 ? "mt-4" : undefined}>
        <SchemaTab
          schema={schema}
          label={currentGroup.label}
          rootName={currentGroup.label}
          defaultView="schema"
        />
      </div>
    </div>
  );
}

// The Request half of the Request/Response strip: a lead-in naming which
// parts the request actually has, then Parameters/Request Body switched by
// the same rule as MessageDetails' Payload/Headers (a tab strip only when
// both are present, a lone one rendering on its own).
function RequestPanel({
  label,
  parameters,
  requestBodyContent,
  requestBodyDescription,
}: {
  label: string;
  parameters: OpenAPIParameterData[];
  requestBodyContent: Record<string, OpenAPIMediaTypeData>;
  requestBodyDescription?: string;
}) {
  const hasParameters = parameters.length > 0;
  const mediaTypes = Object.keys(requestBodyContent);
  const hasBody = mediaTypes.length > 0;
  const [tab, setTab] = useState<"parameters" | "body">(hasParameters ? "parameters" : "body");
  const [selectedMediaType, setSelectedMediaType] = useState(mediaTypes[0]);
  const activeMedia = selectedMediaType ? requestBodyContent[selectedMediaType] : undefined;

  if (!hasParameters && !hasBody) {
    return <p className="text-xs text-foreground-muted italic">No request body or parameters.</p>;
  }

  const parts = [
    hasBody ? "request body" : null,
    parameters.some((param) => param.in === "header") ? "headers" : null,
    parameters.some((param) => param.in === "cookie") ? "cookie" : null,
  ].filter((part): part is string => !!part);

  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-3">
        <span className="font-bold">{label}</span> expects the following {describeRequestParts(parts)}:
      </p>

      {hasParameters && hasBody && (
        <Tabs
          tabs={[
            { id: "parameters", name: "Parameters" },
            { id: "body", name: "Request Body" },
          ]}
          current={tab}
          onChange={(id) => setTab(id as "parameters" | "body")}
        />
      )}
      <div className={hasParameters && hasBody ? "mt-4" : undefined}>
        {(tab === "parameters" || !hasBody) && hasParameters && (
          <ParameterGroups parameters={parameters} />
        )}
        {(tab === "body" || !hasParameters) && hasBody && activeMedia && (
          <SchemaTab
            schema={activeMedia.schema ?? {}}
            label={
              <MediaTypeLabel
                prefix="Request Body"
                mediaTypes={mediaTypes}
                selected={selectedMediaType}
                onChange={setSelectedMediaType}
              />
            }
            rootName="Body "
            description={requestBodyDescription}
            example={resolveMediaExample(activeMedia)}
          />
        )}
      </div>
    </div>
  );
}

// Joins the parts a request actually has ("request body", "headers",
// "cookie") into "a, b, and c" — so the lead-in sentence always names
// what's really there instead of a generic, possibly-misleading "request".
function describeRequestParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "request";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

type ExchangeSide = "request" | "response" | "callbacks";

/**
 * Everything the operation exchanges, as one folder-tab strip over a shared
 * panel: the same shape AsyncAPI's Reply uses for request/reply, since HTTP's
 * request/response is the same idea. Callbacks join the strip because they're
 * part of the operation's contract too, ordered last since that's when they
 * happen; the panel itself explains that their direction is inverted.
 *
 * Only a side with something to show gets a tab, so a GET with no parameters
 * opens straight on Response.
 */
function ExchangeTabs({
  label,
  parameters,
  requestBodyContent,
  requestBodyDescription,
  responses,
  callbacks,
  id,
  depth,
  fillHeight = false,
  onFollowOperation,
  isOperationKnown,
}: {
  label: string;
  parameters: OpenAPIParameterData[];
  requestBodyContent: Record<string, OpenAPIMediaTypeData>;
  requestBodyDescription?: string;
  responses: Record<string, OpenAPIResponseData>;
  callbacks?: Record<string, OpenAPICallbackData>;
  id: string | null;
  depth: number;
  /** Grows the panel to the bottom of the side panel so its surface doesn't stop short under thin content. Off when nested in a callback card, which sizes to its own content. */
  fillHeight?: boolean;
  onFollowOperation?: (operationId: string) => void;
  isOperationKnown?: (operationId: string) => boolean;
}) {
  const hasRequest = parameters.length > 0 || Object.keys(requestBodyContent).length > 0;
  const hasResponse = Object.keys(responses).length > 0;
  // Past the depth cap a callback's own callbacks stop expanding, so the tab
  // that would hold them isn't offered either.
  const hasCallbacks = !!callbacks && Object.keys(callbacks).length > 0 && depth < MAX_CALLBACK_DEPTH;

  const sides: ExchangeSide[] = [
    ...(hasRequest ? (["request"] as const) : []),
    ...(hasResponse ? (["response"] as const) : []),
    ...(hasCallbacks ? (["callbacks"] as const) : []),
  ];
  const [side, setSide] = useState<ExchangeSide>(sides[0] ?? "request");

  if (sides.length === 0) return null;

  const current = sides.includes(side) ? side : sides[0];

  return (
    <div className={fillHeight ? "flex-1 flex flex-col min-h-0" : undefined}>
      <div className="flex items-end gap-0.5 -ml-2" role="tablist" aria-label="Operation exchange">
        {sides.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={current === s}
            onClick={() => setSide(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors capitalize ${
              current === s
                ? "bg-neutral-100 text-foreground border border-b-0 border-border"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* `-mb-4` cancels the side panel's own bottom padding so the surface
          reaches the panel's edge rather than stopping an inch short. */}
      <div
        className={`-mx-5 px-5 py-4 bg-neutral-100 border-t border-border min-h-32 ${
          fillHeight ? "flex-1 -mb-4" : ""
        }`}
      >
        {current === "request" && (
          <RequestPanel
            label={label}
            parameters={parameters}
            requestBodyContent={requestBodyContent}
            requestBodyDescription={requestBodyDescription}
          />
        )}
        {current === "response" && (
          <ResponseTabs
            responses={responses}
            onFollowOperation={onFollowOperation}
            isOperationKnown={isOperationKnown}
          />
        )}
        {current === "callbacks" && callbacks && (
          <OperationCallbacks
            callbacks={callbacks}
            id={id}
            depth={depth}
            renderOperation={PathOperation}
          />
        )}
      </div>
    </div>
  );
}

interface PathOperationProps {
  method: HttpMethod;
  path: string;
  op: OpenAPIOperationData;
  id: string | null;
  /** Prefix for this operation's DOM anchor ids, so webhook anchors stay distinct from endpoint ones. */
  idPrefix?: string;
  /** Falls back to this when the operation doesn't declare its own `security`. */
  globalSecurity?: Array<Record<string, string[]>>;
  /** Scheme definitions (`components.securitySchemes`), resolved by name against `security`'s requirements to render the actual scheme details, not just their names. */
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
  /** Opens the operation a response link points at, by its `operationId`. */
  onFollowOperation?: (operationId: string) => void;
  /** Whether an `operationId` resolves to an operation in the same list, so a response link can be navigable rather than plain text. */
  isOperationKnown?: (operationId: string) => boolean;
  /** Nesting level. A callback's operation may declare callbacks of its own, so past the first level they stop expanding rather than recursing without end. */
  depth?: number;
}

/** How deep callbacks keep expanding. One level covers every real document while staying terminating on a cyclic one. */
const MAX_CALLBACK_DEPTH = 1;

/** The built-in tab, always first — the operation's own documentation
 * content, exactly what rendered here before `openapi.operation.tab` plugins
 * existed. Labeled "Reference" rather than "Documentation": the whole product
 * is documentation, so the more generic word is redundant next to a plugin
 * tab's own specific label (e.g. "Try it"). */
const REFERENCE_TAB_ID = "reference";

export default function PathOperation({
  method,
  path,
  op,
  id,
  idPrefix = "endpoint",
  globalSecurity,
  securitySchemes,
  onFollowOperation,
  isOperationKnown,
  depth = 0,
}: PathOperationProps) {
  // Plugins get the whole document rather than pre-extracted fields — see
  // OpenAPIOperationPluginContext. PathOperation only ever renders under
  // OpenAPIDocumentProvider, so the cast mirrors the same narrowing
  // openapiSections.tsx's useDocument() does.
  const documentContext = useDocumentContext();
  const document =
    documentContext.specType === "openapi"
      ? documentContext.document
      : (documentContext.document as unknown as OpenAPIDocumentData);

  // Path and query parameters are already surfaced via the address bar's
  // tooltip (see Paths.tsx) — only header/cookie parameters still need their
  // own tab here.
  const parameters = (op.parameters ?? []).filter((param) => param.in !== "query" && param.in !== "path");
  const security = op.security ?? globalSecurity ?? [];
  const responses = op.responses ?? {};
  const requestBodyContent = op.requestBody?.content ?? {};
  const label = op.operationId ? humanizeOperationId(op.operationId) : `${method.toUpperCase()} ${path}`;

  // The requirement list only names schemes + the scopes *this operation*
  // asks for; the scheme definitions themselves (auth flows, key placement,
  // ...) live separately in `components.securitySchemes`. Union the required
  // scopes per scheme name across whatever OR'd requirement entries
  // reference it, so Authorization can show what's actually needed here
  // rather than the scheme's entire scope catalog.
  const requiredScopesByScheme = new Map<string, string[]>();
  for (const requirement of security) {
    for (const [schemeName, scopes] of Object.entries(requirement)) {
      if (scopes.length === 0) continue;
      const existing = requiredScopesByScheme.get(schemeName) ?? [];
      requiredScopesByScheme.set(schemeName, Array.from(new Set([...existing, ...scopes])));
    }
  }

  const resolvedSchemes = Array.from(new Set(security.flatMap((requirement) => Object.keys(requirement))))
    .map((name) => {
      const scheme = securitySchemes?.[name];
      if (!scheme) return null;
      const requiredScopes = requiredScopesByScheme.get(name);
      return requiredScopes ? { ...scheme, requiredScopes } : scheme;
    })
    .filter((scheme): scheme is OpenAPISecuritySchemeData => !!scheme);

  // A flex column (rather than `space-y-6`) so the exchange panel can take the
  // height left over below the badges, summary and Authorization. `min-h-full`
  // only at the top level: nested in a callback card there's no leftover height
  // to take, and stretching there would be wrong.
  const isRoot = depth === 0;

  // A callback's own operation renders inline inside its parent's Callbacks
  // tab, not as its own panel — no tab strip there, just the documentation
  // content, same as before `openapi.operation.tab` existed.
  const tabPlugins = useOperationTabPlugins("openapi.operation.tab");
  const [activeTabId, setActiveTabId] = useState<string>(REFERENCE_TAB_ID);
  const showTabs = isRoot && tabPlugins.length > 0;
  const activePlugin = showTabs ? tabPlugins.find((entry) => entry.id === activeTabId) : undefined;
  const ActivePluginComponent = activePlugin?.Component;

  return (
    <div
      className={`flex flex-col gap-6 ${isRoot ? "min-h-full" : ""}`}
      id={`${idPrefix}-${id}-detail`}
    >
      {showTabs && (
        <Tabs
          variant="segmented"
          ariaLabel="Operation view"
          tabs={[
            { id: REFERENCE_TAB_ID, name: "Reference" },
            ...tabPlugins.map((entry) => ({ id: entry.id, name: entry.label })),
          ]}
          current={activePlugin ? activePlugin.id : REFERENCE_TAB_ID}
          onChange={setActiveTabId}
        />
      )}

      {activePlugin && ActivePluginComponent ? (
        <PluginBoundary label={`openapi.operation.tab:${activePlugin.id}`}>
          <ActivePluginComponent document={document} method={method} path={path} />
        </PluginBoundary>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {op.deprecated && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                Deprecated
              </span>
            )}
            {op.externalDocs?.url && (
              <a
                href={op.externalDocs.url}
                target="_blank"
                rel="noreferrer"
                title={op.externalDocs.description || op.externalDocs.url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-foreground-secondary border border-border hover:bg-neutral-200 transition-colors"
              >
                External Documentation
                <IconExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {op.summary && <p className="text-sm text-foreground-secondary">{op.summary}</p>}
          {op.description && <Markdown>{op.description}</Markdown>}

          <Suspense fallback={null}>
            <CodeSamples
              method={method}
              path={path}
              parameters={parameters}
              requestBody={op.requestBody}
              security={security}
              id={id}
            />
          </Suspense>

          <PluginSlot name="openapi.operation.reference.supplementary" context={{ document, method, path }} />

          {security.length > 0 && (
            <div id={`${idPrefix}-${id}-security`}>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
                Authorization
              </p>


              {resolvedSchemes.length > 0 && (
                <CollapsiblePanel
                  className="mt-3"
                  trigger={
                    <span className="flex items-center gap-2 text-xs font-normal text-foreground-muted">
                      <IconShieldCheck className="h-4 w-4 text-foreground-muted" />
                      <span className="bg-neutral-100 border border-border rounded-full px-2 py-0.5">
                        {resolvedSchemes.length}
                      </span>
                    </span>
                  }
                >
                  <div className="px-4 py-2 border-t border-border">
                    <Authorization securities={resolvedSchemes} />
                  </div>
                </CollapsiblePanel>
              )}
            </div>
          )}

          <ExchangeTabs
            label={label}
            parameters={parameters}
            requestBodyContent={requestBodyContent}
            requestBodyDescription={op.requestBody?.description}
            responses={responses}
            callbacks={op.callbacks}
            id={id}
            depth={depth}
            fillHeight={isRoot}
            onFollowOperation={onFollowOperation}
            isOperationKnown={isOperationKnown}
          />
        </>
      )}
    </div>
  );
}
