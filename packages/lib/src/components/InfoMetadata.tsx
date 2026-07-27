import { ReactNode } from "react";
import IconAtSymbol from "../icons/AtSymbol";
import IconExternalLink from "../icons/ExternalLink";
import IconGlobe from "../icons/Globe";
import IconScale from "../icons/Scale";
import IconTag from "../icons/Tag";
import DefinitionListItem from "./DefinitionListItem";
import Tag from "./Tag";
import {
  LICENSE_TEXT,
  CONTACT_TEXT,
  TAGS_TEXT,
  EMAIL_TEXT,
  EXTERNAL_DOCUMENTATION_TEXT,
} from "../contants";
import { Tag as TagType } from "../types/asyncapi/Tag";
import { ExternalDocs } from "../types/asyncapi/ExternalDocs";

// Structurally compatible with both AsyncAPI's and OpenAPI's info/tag shapes
// (each spec's actual type is a superset of what's read here), so this
// component works for either without callers casting to AsyncAPI's types.
interface InfoMetadataProps {
  license?: { name?: string; url?: string };
  externalDocs?: { description?: string; url?: string };
  contact?: { name?: string; url?: string; email?: string };
  tags?: unknown[];
  /** `info.x-logo`, rendered above the metadata list. */
  logo?: ReactNode;
}

export default function InfoMetadata({
  license,
  externalDocs,
  contact,
  tags,
  logo,
}: InfoMetadataProps) {
  const details = {
    licenseName: license?.name ?? null,
    licenseUrl: license?.url ?? null,
    externalDocsTitle: externalDocs?.description ?? "External documentation",
    externalDocsUrl: externalDocs?.url ?? null,
    externalDocsDescription: externalDocs?.description ?? null,
    contactName: contact?.name ?? null,
    contactUrl: contact?.url ?? null,
    contactEmail: contact?.email ?? null,
    tags,
  };
  return (
    <>
      {logo && <div className="mb-3">{logo}</div>}
      <dl className="flex flex-wrap @lg:flex-unwrap gap-2 ">
        {details.licenseName && (
          <DefinitionListItem
            IconClass={IconScale}
            text={`${details.licenseName} ${LICENSE_TEXT}`}
            term={LICENSE_TEXT}
            visibleTerm={details.licenseName ? false : true}
            href={details.licenseUrl}
            className="mb-4 text-foreground-secondary hover:text-pink-500"
          />
        )}
        {details.externalDocsUrl && (
          <DefinitionListItem
            IconClass={IconExternalLink}
            text={EXTERNAL_DOCUMENTATION_TEXT}
            href={details.externalDocsUrl}
            term={EXTERNAL_DOCUMENTATION_TEXT}
            visibleTerm={details.externalDocsTitle ? false : true}
            className="mb-4 text-foreground-secondary hover:text-secondary-500"
          />
        )}
        {details.contactEmail && (
          <DefinitionListItem
            IconClass={IconAtSymbol}
            text={`${details.contactEmail}`}
            term={EMAIL_TEXT}
            visibleTerm={details.contactEmail ? false : true}
            href={`mailto:${details.contactEmail}`}
            className="mb-4 text-foreground-secondary hover:text-green-500"
          />
        )}
        {details.contactUrl && (
          <DefinitionListItem
            IconClass={IconGlobe}
            text={`${details.contactName}`}
            term={CONTACT_TEXT}
            visibleTerm={details.contactName ? false : true}
            href={details.contactUrl}
            className="mb-4 text-foreground-secondary hover:text-green-500"
          />
        )}
      </dl>
      <dl>
        {details.tags && (
          <DefinitionListItem
            IconClass={IconTag}
            term={TAGS_TEXT}
            className="mb-2 text-foreground-secondary inline-block"
            vertical
            text={
              details.tags && (
                <div className="flex flex-wrap gap-1 -ml-2">
                  {details.tags.map((tag, index) => {
                    const t = tag as TagType;
                    const extDocs = t.externalDocs as ExternalDocs | undefined;
                    return (
                      <Tag
                        key={index}
                        href={extDocs && extDocs.url}
                        title={
                          t.description ||
                          (extDocs && extDocs.description
                            ? extDocs.description
                            : undefined)
                        }
                        name={t.name}
                      />
                    );
                  })}
                </div>
              )
            }
          />
        )}
      </dl>
    </>
  );
}
