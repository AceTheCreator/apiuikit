import { ReactNode } from "react";

interface SectionProps {
  title?: string;
  content?: ReactNode;
  sideContent?: ReactNode | null;
  stickySideContent: boolean;
  info?: boolean;
  reverseLayoutOnMobile?: boolean;
  /** Rendered directly above the title, visible on small screens only (e.g. a logo that otherwise lives at the top of the desktop sidebar). */
  mobileLeadContent?: ReactNode;
}

export default function Section({
  title,
  content,
  sideContent,
  stickySideContent = false,
  info = false,
  reverseLayoutOnMobile = false,
  mobileLeadContent,
}: SectionProps) {
  return (
    <div className="w-full @lg:max-w-[calc(70ch+28rem)] @lg:mx-auto mt-6">
      {mobileLeadContent && <div className="@lg:hidden mb-3">{mobileLeadContent}</div>}
      {title && (
        <h1
          className={`${info ? "text-4xl inline-block text-3xl font-extrabold text-foreground tracking-tight" : "text-2xl"} mb-4 @lg:mb-0 font-bold`}
        >
          {title}
        </h1>
      )}
      <section
        className={`border-border text-lg flex gap-6 @lg:gap-0 ${
          sideContent && reverseLayoutOnMobile
            ? "flex-col-reverse @lg:flex-row"
            : "flex-col @lg:flex-row"
        }`}
      >
        <div className="@lg:w-prose min-w-0">{content}</div>
        <div className="@lg:pl-12 @lg:w-[400px] shrink-0">
          <div className={`${stickySideContent && "@lg:sticky @lg:top-4"}`}>
            {sideContent}
          </div>
        </div>
      </section>
    </div>
  );
}
