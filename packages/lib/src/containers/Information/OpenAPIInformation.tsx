import InformationSection from "./InformationSection";
import { OpenAPIExternalDocsData, OpenAPIInfoData, OpenAPITagData } from "../../types/openapi";

interface OpenAPIInformationProps {
  info: OpenAPIInfoData;
  /** OpenAPI keeps tags/externalDocs at the document root, not on `info` (unlike AsyncAPI), so they are passed in separately. */
  tags?: OpenAPITagData[];
  externalDocs?: OpenAPIExternalDocsData;
}

export default function OpenAPIInformation({ info, tags, externalDocs }: OpenAPIInformationProps) {
  const { title, description, license, contact } = info;

  return (
    <InformationSection
      title={title}
      description={description}
      license={license}
      contact={contact}
      externalDocs={externalDocs}
      tags={tags}
      extensionsSource={info}
    />
  );
}
