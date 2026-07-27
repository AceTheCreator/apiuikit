import type { ExtensionComponentProps } from "../types";
import { LinkedInIcon } from "./icons/LinkedInIcon";

/**
 * Renders `info.x-linkedin` as an icon link. Expects a full URL: LinkedIn
 * paths vary by entity type (/company/, /in/, /school/, ...), so a bare slug
 * can't be safely expanded into the right one, renders nothing rather than a
 * guessed (and possibly wrong) link.
 */
export default function LinkedInExtension({ value }: ExtensionComponentProps) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="LinkedIn"
      title="LinkedIn"
      className="inline-flex items-center justify-center text-foreground-muted hover:text-foreground"
    >
      <LinkedInIcon className="h-4 w-4" />
    </a>
  );
}
