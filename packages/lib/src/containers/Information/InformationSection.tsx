import { lazy, Suspense } from "react";
import { logoLoader, resolveLogo } from "x-tensions";
import Section, { type SectionLayout } from "../../components/Section";
import Markdown from "../../components/Markdown";
import InfoMetadata from "../../components/InfoMetadata";
import { RenderExtensions, getExtension } from "../../components/RenderExtensions";

const LazyLogo = lazy(logoLoader);

interface InformationSectionProps {
  title?: string;
  description?: string;
  license?: { name?: string; url?: string };
  contact?: { name?: string; url?: string; email?: string };
  externalDocs?: { description?: string; url?: string };
  tags?: unknown[];
  /** The raw `info` object, scanned for x-* extensions (`x-logo` plus the x-tensions catalog). */
  extensionsSource?: object;
  layout?: SectionLayout;
  /** Full document layouts render the logo in their masthead instead. */
  showLogo?: boolean;
}

interface InformationLogoProps {
  source?: object;
}

export const hasInformationLogo = (source?: object): boolean =>
  resolveLogo(getExtension(source, "x-logo")) !== null;

/** Renders the special `info.x-logo` extension outside the generic extension row. */
export function InformationLogo({ source }: InformationLogoProps) {
  const value = getExtension(source, "x-logo");
  if (!resolveLogo(value)) return null;

  return (
    <Suspense fallback={null}>
      <LazyLogo value={value} path="info.x-logo" />
    </Suspense>
  );
}

export default function InformationSection({
  title,
  description,
  license,
  contact,
  externalDocs,
  tags,
  extensionsSource,
  layout,
  showLogo = true,
}: InformationSectionProps) {
  const logo = showLogo ? <InformationLogo source={extensionsSource} /> : null;

  const content = (
    <div className="mt-4 w-full">
      <Markdown>{description}</Markdown>
    </div>
  );

  const sideContent = (
    <>
      <InfoMetadata logo={logo} license={license} externalDocs={externalDocs} contact={contact} tags={tags} />
      {extensionsSource && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RenderExtensions source={extensionsSource} pathPrefix="info" />
        </div>
      )}
    </>
  );

  return (
    <div className="flex justify-center w-full">
      <Section
        title={title}
        content={content}
        sideContent={sideContent}
        stickySideContent={true}
        reverseLayoutOnMobile={true}
        info={true}
        mobileLeadContent={logo}
        layout={layout}
      />
    </div>
  );
}
