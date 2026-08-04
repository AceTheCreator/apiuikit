import Markdown from "../../components/Markdown";
import ServerAddressBanner from "../../components/ServerAddressBanner";
import { OpenAPIServerData } from "../../types/openapi";

type OpenAPIServerProps = OpenAPIServerData;

export default function OpenAPIServer({ url, description, variables }: OpenAPIServerProps) {
  return (
    <div>
      <ServerAddressBanner address={url} variables={variables} />
      {description && <Markdown>{description}</Markdown>}
    </div>
  );
}
