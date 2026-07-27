import React from "react";
import Section from "../../components/Section";
import Markdown from "../../components/Markdown";
import InfoMetadata from "../../components/InfoMetadata";
import { Info as AsyncAPIMetadata } from "../../types/asyncapi/Info";

const Information: React.FunctionComponent<AsyncAPIMetadata> = ({
  title,
  description,
  license,
  externalDocs,
  contact,
  tags,
}) => {

  const content = (
      <div className="mt-4 w-full">
        <Markdown>{description}</Markdown>
      </div>
  );

  const sideContent = (
    <InfoMetadata
      license={license}
      // externalDocs is typed as `Reference | ExternalDocs` (a $ref union) —
      // by the time this component renders, resolveDocument/@asyncapi/parser
      // have already inlined any $ref, so this is always a real ExternalDocs.
      externalDocs={externalDocs as { description?: string; url?: string } | undefined}
      contact={contact}
      tags={tags}
    />
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
