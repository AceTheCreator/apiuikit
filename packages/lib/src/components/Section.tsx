import { ReactNode } from "react";

/** Doc section column geometry. Default `"columns"` keeps the reserved right gutter. */
export type SectionLayout = "columns" | "stacked";

interface SectionProps {
  title?: string;
  content?: ReactNode;
  sideContent?: ReactNode | null;
  stickySideContent: boolean;
  info?: boolean;
  reverseLayoutOnMobile?: boolean;
  /** Rendered directly above the title, visible on small screens only (e.g. a logo that otherwise lives at the top of the desktop sidebar). */
  mobileLeadContent?: ReactNode;
  /**
   * `"columns"` (default) — two-column layout at `@lg` with a reserved 400px
   * right gutter (used for side content, or left empty so lists align with
   * Info/Servers in the full widget).
   * `"stacked"` — single column at full container width; no reserved gutter
   * and no prose max-width. When `sideContent` is present it renders below
   * the main content. Prefer this when embedding a section alone (e.g. an
   * Operations table) so long addresses aren't force-truncated.
   */
  layout?: SectionLayout;
}

export default function Section({
  title,
  content,
  sideContent,
  stickySideContent = false,
  info = false,
  reverseLayoutOnMobile = false,
  mobileLeadContent,
  layout = "columns",
}: SectionProps) {
  const stacked = layout === "stacked";
  const hasSideContent = sideContent != null && sideContent !== false;
  const titleClassName = `${
    info
      ? "text-4xl inline-block text-3xl font-extrabold text-foreground tracking-tight"
      : "text-2xl"
  } mb-4 @lg:mb-0 font-bold`;

  return (
    <div
      className={`w-full mt-6 ${
        stacked ? "" : "@lg:mx-auto @lg:max-w-[calc(70ch+28rem)]"
      }`}
    >
      {mobileLeadContent && (
        <div className="@lg:hidden mb-3">{mobileLeadContent}</div>
      )}
      {title && (
        <div className={stacked ? "w-full" : "@lg:w-prose"}>
          <h1 className={titleClassName}>{title}</h1>
        </div>
      )}
      <section
        className={`border-border text-lg flex gap-6 @lg:gap-0 ${
          stacked
            ? "flex-col"
            : hasSideContent && reverseLayoutOnMobile
            ? "flex-col-reverse @lg:flex-row"
            : "flex-col @lg:flex-row"
        }`}
      >
        <div className={`${stacked ? "w-full" : "@lg:w-prose"} min-w-0`}>
          {content}
        </div>
        {stacked ? (
          hasSideContent && (
            <div
              className={stickySideContent ? "@lg:sticky @lg:top-4" : undefined}
            >
              {sideContent}
            </div>
          )
        ) : (
          <div
            className="@lg:pl-12 @lg:w-[400px] shrink-0"
            data-testid="section-side-column"
          >
            <div className={`${stickySideContent && "@lg:sticky @lg:top-4"}`}>
              {sideContent}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
