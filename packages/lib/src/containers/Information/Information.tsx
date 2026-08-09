import React from "react";
import type { SectionLayout } from "../../components/Section";
import InformationSection from "./InformationSection";
import { Info as AsyncAPIMetadata } from "../../types/asyncapi/Info";

type InformationProps = AsyncAPIMetadata & { layout?: SectionLayout };

const Information: React.FunctionComponent<InformationProps> = ({
  title,
  description,
  license,
  externalDocs,
  contact,
  tags,
  layout,
  ...extensionsSource
}) => {
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
      extensionsSource={extensionsSource}
      layout={layout}
    />
  );
};

export default Information;
