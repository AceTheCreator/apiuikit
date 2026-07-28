import React, { lazy, Suspense } from "react";
import { logoLoader } from "x-tensions";
import Section from "../../components/Section";
import Markdown from "../../components/Markdown";
import InfoMetadata from "../../components/InfoMetadata";
import { RenderExtensions } from "../../components/RenderExtensions";
import { Info as AsyncAPIMetadata } from "../../types/asyncapi/Info";

const LazyLogo = lazy(logoLoader);

const Information: React.FunctionComponent<AsyncAPIMetadata> = (info) => {
  const { title, description, license, externalDocs, contact, tags } = info;
  const logoValue = (info as unknown as Record<string, unknown>)["x-logo"];

  const content = (
      <div className="mt-4 w-full">
        <Markdown>{description}</Markdown>
      </div>
  );

  const logo = logoValue !== undefined && (
    <Suspense fallback={null}>
      <LazyLogo value={logoValue} path="info.x-logo" />
    </Suspense>
  );

  const sideContent = (
    <>
      <InfoMetadata
        logo={logo}
        license={license}
        // externalDocs is typed as `Reference | ExternalDocs` (a $ref union) —
        // by the time this component renders, resolveDocument/@asyncapi/parser
        // have already inlined any $ref, so this is always a real ExternalDocs.
        externalDocs={externalDocs as { description?: string; url?: string } | undefined}
        contact={contact}
        tags={tags}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <RenderExtensions source={info as unknown as Record<string, unknown>} pathPrefix="info" />
      </div>
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
};

export default Information;
