import React from "react";
import InformationSection from "./InformationSection";
import { Info as AsyncAPIMetadata } from "../../types/asyncapi/Info";

const Information: React.FunctionComponent<AsyncAPIMetadata> = (info) => {
  const { title, description, license, externalDocs, contact, tags } = info;

  return (
    <InformationSection
      title={title}
      description={description}
      license={license}
      // externalDocs is typed as `Reference | ExternalDocs` (a $ref union):
      // by the time this component renders, resolveDocument/@asyncapi/parser
      // have already inlined any $ref, so this is always a real ExternalDocs.
      externalDocs={externalDocs as { description?: string; url?: string } | undefined}
      contact={contact}
      tags={tags}
      extensionsSource={info}
    />
  );
};

export default Information;
