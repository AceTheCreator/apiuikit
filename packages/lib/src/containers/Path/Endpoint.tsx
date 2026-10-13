import { useMemo } from "react";
import Section, { type SectionLayout } from "../../components/Section";
import ItemCard from "../../components/ItemCard";
import {
  endpointKey,
  flattenEndpoints,
  HttpMethod,
  OpenAPIPathItemData,
  OpenAPISecuritySchemeData,
  resolveOperationParameters,
} from "../../types/openapi";
import PathOperation from "./PathOperation";
import { EndpointHeaderActions, EndpointTitle } from "./EndpointHeader";

interface EndpointProps {
  method: HttpMethod;
  path: string;
  /** The Path Item `path` lives under; its shared parameters merge into the operation's. */
  pathItem: OpenAPIPathItemData;
  /** Every path in the same list, so response links can tell whether their target operationId exists. */
  paths: Record<string, OpenAPIPathItemData | undefined>;
  security?: Array<Record<string, string[]>>;
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
  /** Prefix for DOM anchor ids — "webhook" for webhooks, as in Paths.tsx. */
  idPrefix?: string;
  /** Called when a response link to another operation is followed. Without it, links render as plain text. */
  onNavigate?: (operationId: string) => void;
  layout?: SectionLayout;
}

/**
 * One endpoint (or webhook) rendered inline: the header and detail the list's
 * side panel shows for it (Paths.tsx), framed as a card in the page flow.
 */
export default function Endpoint({
  method,
  path,
  pathItem,
  paths,
  security,
  securitySchemes,
  idPrefix = "endpoint",
  onNavigate,
  layout,
}: EndpointProps) {
  const op = pathItem[method];
  const parameters = resolveOperationParameters(pathItem, op);

  const knownOperationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const endpoint of flattenEndpoints(paths)) {
      const operationId = paths[endpoint.path]?.[endpoint.method]?.operationId;
      if (operationId) ids.add(operationId);
    }
    return ids;
  }, [paths]);

  if (!op) return null;
  const key = endpointKey(method, path);

  return (
    <div className="flex justify-center w-full">
      <Section
        stickySideContent={false}
        layout={layout}
        content={
          <ItemCard
            title={<EndpointTitle method={method} path={path} parameters={parameters} />}
            headerActions={<EndpointHeaderActions method={method} path={path} />}
          >
            <PathOperation
              method={method}
              path={path}
              op={{ ...op, parameters }}
              id={key}
              idPrefix={idPrefix}
              globalSecurity={security}
              securitySchemes={securitySchemes}
              isOperationKnown={(operationId) => !!onNavigate && knownOperationIds.has(operationId)}
              onFollowOperation={onNavigate}
            />
          </ItemCard>
        }
      />
    </div>
  );
}
