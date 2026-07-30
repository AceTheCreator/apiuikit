import { lazy, Suspense } from "react";
import { logoLoader } from "x-tensions";
import Section from "../../components/Section";
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
}

export default function InformationSection({
  title,
  description,
  license,
  contact,
  externalDocs,
  tags,
  extensionsSource,
}: InformationSectionProps) {
  const logoValue = getExtension(extensionsSource, "x-logo");

  const logo = logoValue !== undefined && (
    <Suspense fallback={null}>
      <LazyLogo value={logoValue} path="info.x-logo" />
    </Suspense>
  );

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
      />
    </div>
  );
}
