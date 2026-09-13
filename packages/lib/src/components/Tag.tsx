import { isUrl } from "../helpers/common";

interface TagProps {
  name: string;
  href?: string;
  title?: string;
}

export default function Tag({ name, href, title }: TagProps) {
  // `href` comes from a tag's `externalDocs.url` in the parsed spec —
  // untrusted content — so only ever render http(s), never e.g. `javascript:`.
  const safeHref = href && isUrl(href) ? href : undefined;
  return (
    <a
      className={`text-xs whitespace-nowrap break-all mt-2 rounded-md bg-neutral-300 py-[2px] px-[4px] mr-1 -mt-1 ${
        safeHref && "hover:bg-cyan-500 hover:text-white"
      }`}
      href={safeHref}
      target="_blank"
      rel="noreferrer"
      title={title}
    >
      {name}
    </a>
  );
}
