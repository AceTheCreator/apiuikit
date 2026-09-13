import { FC, ComponentType, ReactNode } from "react";
import { isUrl } from "../helpers/common";

interface WrapperProps {
  children: ReactNode;
  className?: string;
}

interface DefinitionListItemProps {
  IconClass?: ComponentType<{ className: string; title: string; alt: string }>;
  text: string | ReactNode;
  href?: string | null;
  term?: string;
  visibleTerm?: boolean;
  vertical?: boolean;
  className?: string;
}

export default function DefinitionListItem({
  IconClass,
  term,
  visibleTerm = true,
  text,
  href,
  vertical = false,
  className = "",
}: DefinitionListItemProps) {
  // `href` here is often lifted straight from a parsed AsyncAPI/OpenAPI
  // document (license/externalDocs/contact URLs) — untrusted spec content.
  // Only render it as a link when it's http(s) or a `mailto:` we constructed
  // ourselves, so a spec can't smuggle a `javascript:` URI into the DOM.
  const safeHref = href && (isUrl(href) || href.startsWith("mailto:")) ? href : undefined;
  const Wrapper: FC<WrapperProps> = safeHref
    ? (props) => <a href={safeHref} target="_blank" rel="noreferrer" {...props} />
    : (props) => <div {...props} />;

  return (
    <div className={`${!vertical && "flex"} ${className}`}>
      <dt>
        <Wrapper className="flex">
          {IconClass && (
            <IconClass className="w-5 h-5" title={`${text}`} alt={`${text}`} />
          )}
          {visibleTerm ? (
            <span className="pl-2 text-sm">{term}</span>
          ) : (
            <span className="sr-only">{term}</span>
          )}
        </Wrapper>
      </dt>
      <dd className={`${vertical && "pt-2"} pl-2 text-sm`}>
        {!visibleTerm && <Wrapper>{text}</Wrapper>}
        {vertical && <Wrapper>{text}</Wrapper>}
      </dd>
    </div>
  );
}
