import { lazy } from "react";
import { ChannelAddress } from "../../components/ChannelAddress";
import QueryParameters from "../../components/QueryParameters";
import MethodBadge from "../../components/MethodBadge";
import { HttpMethod, OpenAPIParameterData } from "../../types/openapi";
import { useDocumentContext } from "../../contexts";
import { toChannelAddressParameters, toQueryParameters } from "../../helpers/openapiParameters";
import { PluginBoundary } from "../../plugins/PluginSlot";

// The built-in "Try it" panel. A dependency rather than vendored source, and
// external in the build (see vite.config.ts), so it resolves from the
// consumer's own node_modules — the same apiuikit instance their app loaded,
// and therefore the same DocumentContext.
//
// A loader rather than a static import so bundlers split it into its own
// chunk, and the `showTryIt` check below sits at the *call site*, before this
// element is ever created: a consumer who leaves `show.tryIt` off never
// fetches it. Guarding inside the component would download it, then render
// null — which is what `show.codeSamples` does today.
const TryItHeaderButton = lazy(() =>
  import("@apiuikit/openapi-try-it-plugin").then(({ TryItHeaderButton: component }) => ({
    default: component,
  })),
);

/**
 * An endpoint's identity: method badge, path, query-parameter chip. The path
 * keeps the room and clips to a single line (its ellipsis peeks the whole
 * thing); the query parameters — the part that actually ran the header long —
 * sit beside it as a chip. Shared by the list's side-panel title (Paths.tsx)
 * and the inline single-endpoint card (Endpoint.tsx).
 */
export function EndpointTitle({
  method,
  path,
  parameters,
}: {
  method: HttpMethod;
  path: string;
  parameters: OpenAPIParameterData[];
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <MethodBadge method={method} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <ChannelAddress
          address={path}
          parameters={toChannelAddressParameters(parameters)}
          truncate
          peek
          className="text-xs"
        />
      </div>
      <QueryParameters parameters={toQueryParameters(parameters)} />
    </div>
  );
}

/**
 * The built-in Try-it button for an endpoint, or nothing while `show.tryIt`
 * is off or the ambient document isn't an OpenAPI one.
 */
export function EndpointHeaderActions({ method, path }: { method: HttpMethod; path: string }) {
  // Read spec-agnostically and narrowed rather than via
  // useOpenAPIDocumentContext: an OpenAPI section mis-nested under an
  // AsyncAPI provider warns and renders empty instead of throwing (see
  // openapiSections' useDocument), and this must not be what makes it crash.
  const context = useDocumentContext();
  const document = context.specType === "openapi" ? context.document : null;
  if (context.showTryIt !== true || !document) return null;
  return (
    // `shrink-0`: the address beside it is `min-w-0 flex-1`, so without this
    // the button would win the row and squeeze the address instead of
    // letting it truncate as designed.
    <div className="flex shrink-0 items-center gap-2">
      {/* The same isolation a third-party fill gets: error boundary plus
          Suspense. Rendering this directly rather than through a slot is what
          keeps the header out of the public plugin contract, but it shouldn't
          also mean the built-in is the one piece of plugin code that can take
          the document down with it. */}
      <PluginBoundary label="built-in:openapi.operation.tryIt">
        <TryItHeaderButton document={document} method={method} path={path} />
      </PluginBoundary>
    </div>
  );
}
