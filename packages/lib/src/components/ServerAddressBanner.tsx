import type { ReactNode } from "react";
import IconLink from "../icons/Link";
import { ChannelAddress } from "./ChannelAddress";

// Structurally compatible with both AsyncAPI's ServerVariable and OpenAPI's
// ServerVariableObject (each spec's actual type is a superset of what
// ChannelAddress reads for its hover tooltips), so both spec wrappers pass
// their own variables without casting.
export interface ServerAddressVariable {
  description?: string;
  enum?: string[];
  default?: string;
  examples?: string[];
}

interface ServerAddressBannerProps {
  /** The server's host/url. The banner still renders without one, matching the previous per-spec behavior. */
  address?: string;
  variables?: Record<string, ServerAddressVariable>;
  /** Extra rows rendered inside the banner below the address box (e.g. AsyncAPI's tag list). */
  children?: ReactNode;
}


export default function ServerAddressBanner({ address, variables, children }: ServerAddressBannerProps) {
  return (
    <div className="font-bold text-foreground-secondary mt-8 mb-4 bg-neutral-200 border border-neutral-500 p-4 rounded-lg">
      <div className="border border-dotted border-black p-2 rounded-lg bg-surface">
        <IconLink className="inline-block mr-1 -mt-1 h-6 text-foreground-muted" />
        {address && (
          <ChannelAddress
            address={address}
            parameters={variables}
            className="font-bold leading-tight tracking-tight px-0"
          />
        )}
      </div>
      {children}
    </div>
  );
}
