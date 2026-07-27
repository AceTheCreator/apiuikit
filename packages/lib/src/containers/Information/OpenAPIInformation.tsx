import Section from "../../components/Section";
import Markdown from "../../components/Markdown";
import InfoMetadata from "../../components/InfoMetadata";
import { OpenAPIExternalDocsData, OpenAPIInfoData, OpenAPITagData } from "../../types/openapi";

interface OpenAPIInformationProps {
  info: OpenAPIInfoData;
  /** OpenAPI keeps tags/externalDocs at the document root, not on `info` (unlike AsyncAPI) — passed in separately. */
  tags?: OpenAPITagData[];
  externalDocs?: OpenAPIExternalDocsData;
}

/**
 * Mirrors Information (AsyncAPI) using the same underlying building blocks —
 * InfoMetadata only cares about license/externalDocs/contact/tags shapes,
 * which OpenAPI's Info/Tag/ExternalDocs objects satisfy structurally.
 */
export default function OpenAPIInformation({ info, tags, externalDocs }: OpenAPIInformationProps) {
  const { title, description, license, contact } = info;

  const content = (
    <div className="mt-4 w-full">
      <Markdown>{description}</Markdown>
    </div>
  );

  const sideContent = (
    <InfoMetadata license={license} externalDocs={externalDocs} contact={contact} tags={tags} />
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
