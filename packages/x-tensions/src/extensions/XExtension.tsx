import type { ExtensionComponentProps } from "../types";
import { XIcon } from "./icons/XIcon";

/** Renders `info.x-x`: an X (Twitter) handle, as an icon link to the profile. */
export default function XExtension({ value }: ExtensionComponentProps) {
  if (typeof value !== "string" || !value) return null;
  const handle = value.replace(/^@/, "");
  const label = `@${handle} on X`;
  return (
    <a
      href={`https://x.com/${handle}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center text-foreground-muted hover:text-foreground"
    >
      <XIcon className="h-4 w-4" />
    </a>
  );
}
