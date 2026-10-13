import { lazy } from "react";
import { ChannelAddress } from "../../components/ChannelAddress";
import MethodBadge from "../../components/MethodBadge";
import { Channel } from "../../types/asyncapi/Channel";
import { Parameter } from "../../types/asyncapi/Parameter";
import { Operation as OperationType } from "../../types/asyncapi/Operation";
import { useDocumentContext } from "../../contexts";
import { PluginBoundary } from "../../plugins/PluginSlot";

// The built-in WebSocket "Try it" panel — the AsyncAPI counterpart to the
// OpenAPI one in EndpointHeader.tsx, loaded the same way and for the same
// reasons: a dependency kept external in the build, and a lazy chunk gated on
// `show.tryIt` at the call site so it's never fetched while the flag is off.
const WsHeaderButton = lazy(() =>
  import("@apiuikit/ws-try-it-plugin").then(({ WsHeaderButton: component }) => ({
    default: component,
  })),
);

/**
 * An operation's identity: action badge and channel address. Shared by the
 * list's side-panel title (Operations.tsx) and the inline single-operation
 * card. Falls back to the operation key for a channel without an address.
 */
export function OperationTitle({ op, operationKey }: { op: OperationType; operationKey: string }) {
  // $refs (e.g. op.channel) are already inlined by resolveDocument /
  // @asyncapi/parser before the document reaches any component.
  const channel = op.channel as unknown as Channel | undefined;
  if (!channel?.address) return <>{operationKey}</>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <MethodBadge method={op.action} />
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Clipped to one line, same as the endpoint header: a long channel
            address otherwise wraps and pushes the actions around. Its
            ellipsis peeks the full address on hover/focus. */}
        <ChannelAddress
          address={channel.address}
          parameters={channel.parameters as unknown as Record<string, Parameter>}
          truncate
          peek
        />
      </div>
    </div>
  );
}

/**
 * The built-in WebSocket Try-it button for an operation, or nothing while
 * `show.tryIt` is off. The button itself renders nothing for an operation
 * with no WebSocket server, so non-WS documents get an unchanged header.
 */
export function OperationHeaderActions({ operationKey }: { operationKey: string }) {
  // Read spec-agnostically and narrowed: a mis-nested section must not crash on this.
  const context = useDocumentContext();
  const document = context.specType === "asyncapi" ? context.document : null;
  if (context.showTryIt !== true || !document) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <PluginBoundary label="built-in:asyncapi.operation.tryIt">
        <WsHeaderButton document={document} operationId={operationKey} />
      </PluginBoundary>
    </div>
  );
}
