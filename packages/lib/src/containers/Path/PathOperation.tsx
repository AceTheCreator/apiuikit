import { useEffect, useState } from "react";
import { SchemaTab } from "../../components/schema";
import Markdown from "../../components/Markdown";
import Tabs from "../../components/Tabs";
import Authorization from "../../components/Authorization";
import CollapsiblePanel from "../../components/CollapsiblePanel";
import IconExternalLink from "../../icons/ExternalLink";
import IconShieldCheck from "../../icons/ShieldCheck";
import IconArrowDown from "../../icons/ArrowDown";
import { PARAMETER_GROUPS } from "../../contants";
import {
  HttpMethod,
  OpenAPIHeaderData,
  OpenAPIMediaTypeData,
  OpenAPIOperationData,
  OpenAPIParameterData,
  OpenAPIResponseData,
  OpenAPISecuritySchemeData,
} from "../../types/openapi";

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
function ResponseTabs({ responses }: { responses: Record<string, OpenAPIResponseData> }) {
  const statuses = Object.keys(responses);
  const [status, setStatus] = useState(statuses[0]);
  const response = responses[status];
  const mediaTypes = Object.keys(response?.content ?? {});
  const [selectedMediaType, setSelectedMediaType] = useState(mediaTypes[0]);
  const activeMedia = selectedMediaType ? response?.content?.[selectedMediaType] : undefined;
  const headers = (response?.headers ?? {}) as Record<string, OpenAPIHeaderData>;
  const [section, setSection] = useState<"body" | "headers">("body");

  const hasBody = mediaTypes.length > 0 && !!activeMedia;
  const hasHeaders = Object.keys(headers).length > 0;
  // Same rule as MessageDetails' Payload/Headers switch: the tab strip only
  // appears when both halves exist, and a lone half renders on its own.
  const showSectionTabs = hasBody && hasHeaders;
  const currentSection = !hasBody ? "headers" : !hasHeaders ? "body" : section;

  // Different statuses can declare entirely different content types (and may
  // not have headers at all), so neither selection can carry over on switch.
  useEffect(() => {
    setSelectedMediaType(Object.keys(response?.content ?? {})[0]);
    setSection("body");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className="flex items-end gap-0.5 -ml-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-t-md transition-colors ${
              status === s
                ? "bg-neutral-100 border border-b-0 border-border"
                : "hover:bg-neutral-50"
            }`}
          >
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${statusBadgeClassName(s)}`}>
              {s}
            </span>
          </button>
        ))}
      </div>

      <div className="-mx-5 px-5 py-4 bg-neutral-100 border-t border-border min-h-32">
        {response?.description && (
          <p className="text-sm text-foreground-secondary mb-3">{response.description}</p>
        )}
        {showSectionTabs && (
          <Tabs
            tabs={[
              { id: "body", name: "Body" },
              { id: "headers", name: "Headers" },
            ]}
            current={currentSection}
            onChange={(id) => setSection(id as "body" | "headers")}
          />
        )}
        <div className={showSectionTabs ? "mt-4" : undefined}>
          {/* Keyed per section: without distinct keys React reuses one
              SchemaTab across the swap and keeps its selected view, so the
              section's own `defaultView` would never apply after a switch. */}
          {currentSection === "headers" && hasHeaders ? (
            <SchemaTab
              key="headers"
              schema={headersToSchema(headers)}
              label="Headers"
              rootName="Headers"
              defaultView="schema"
            />
          ) : hasBody ? (
            <SchemaTab
              key="body"
              schema={activeMedia.schema ?? {}}
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
          ) : (
            <p className="text-xs text-foreground-muted italic">No response body.</p>
          )}
        </div>
      </div>
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

// Mirrors MessageDetails: Parameters and Request Body are grouped into one
// block (tab-switched between the two, same rule as Payload/Headers — only
// shown when both are present) and hidden behind a Show more/Show less
// toggle, collapsed by default, instead of always being fully rendered.
function OperationDetails({
  parameters,
  requestBodyContent,
  requestBodyDescription,
  expanded,
  onToggleExpanded,
}: {
  parameters: OpenAPIParameterData[];
  requestBodyContent: Record<string, OpenAPIMediaTypeData>;
  requestBodyDescription?: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const hasParameters = parameters.length > 0;
  const mediaTypes = Object.keys(requestBodyContent);
  const hasBody = mediaTypes.length > 0;
  const hasMore = hasParameters || hasBody;
  const [tab, setTab] = useState<"parameters" | "body">(hasParameters ? "parameters" : "body");
  const [selectedMediaType, setSelectedMediaType] = useState(mediaTypes[0]);
  const activeMedia = selectedMediaType ? requestBodyContent[selectedMediaType] : undefined;

  if (!hasMore) return null;

  return (
    <>
      <div
        className={`grid transition-all duration-200 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
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
        </div>
      </div>

      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border bg-neutral-50 hover:bg-neutral-100 transition-colors text-xs text-foreground-muted hover:text-foreground-secondary"
      >
        <span>{expanded ? "Show less" : "Show more"}</span>
        <IconArrowDown
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </>
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

// Mirrors Message's own card: an always-visible header sitting above the
// collapsible Parameters/Request Body detail. The lead-in sentence (naming
// whichever of request body/headers/cookie are present) lives inside the
// card itself so its top is never blank — the request-body media type
// selector, when there's more than one, lives inline in the SchemaTab's own
// heading instead (see MediaTypeLabel/OperationDetails).
function RequestCard({
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
  const [expanded, setExpanded] = useState(false);
  const mediaTypes = Object.keys(requestBodyContent);

  if (parameters.length === 0 && mediaTypes.length === 0) return null;

  const parts = [
    mediaTypes.length > 0 ? "request body" : null,
    parameters.some((param) => param.in === "header") ? "headers" : null,
    parameters.some((param) => param.in === "cookie") ? "cookie" : null,
  ].filter((part): part is string => !!part);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
          <span className="font-bold">{label}</span> expects the following {describeRequestParts(parts)}:
        </p>
      </div>

      <OperationDetails
        parameters={parameters}
        requestBodyContent={requestBodyContent}
        requestBodyDescription={requestBodyDescription}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />
    </div>
  );
}

interface PathOperationProps {
  method: HttpMethod;
  path: string;
  op: OpenAPIOperationData;
  id: string | null;
  /** Falls back to this when the operation doesn't declare its own `security`. */
  globalSecurity?: Array<Record<string, string[]>>;
  /** Scheme definitions (`components.securitySchemes`), resolved by name against `security`'s requirements to render the actual scheme details, not just their names. */
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
}

export default function PathOperation({ method, path, op, id, globalSecurity, securitySchemes }: PathOperationProps) {
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

  return (
    <div className="space-y-6" id={`endpoint-${id}-detail`}>
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

      {security.length > 0 && (
        <div id={`endpoint-${id}-security`}>
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

      <RequestCard
        label={label}
        parameters={parameters}
        requestBodyContent={requestBodyContent}
        requestBodyDescription={op.requestBody?.description}
      />

      {Object.keys(responses).length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">
            <span className="font-bold">{label}</span> expects{" "}
            {Object.keys(responses).length > 1 ? "one of the following responses" : "the following response"}:
          </p>
          <ResponseTabs responses={responses} />
        </div>
      )}
    </div>
  );
}
