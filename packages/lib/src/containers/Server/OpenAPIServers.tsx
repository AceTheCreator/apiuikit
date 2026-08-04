import { useState } from "react";
import Section from "../../components/Section";
import VerticalNavigation from "../../components/VerticalNavigation";
import { SERVER_TEXT } from "../../contants";
import { OpenAPIServerData } from "../../types/openapi";
import OpenAPIServer from "./OpenAPIServer";

interface OpenAPIServersProps {
  servers: OpenAPIServerData[];
  selectedServer?: string | null;
  onSelectServer?: (serverKey: string) => void;
}

const keyForIndex = (index: number) => `server-${index}`;
const indexForKey = (key: string) => Number(key.slice("server-".length));

/**
 * OpenAPI's `servers` is an array (no name field), unlike AsyncAPI's keyed
 * map — server keys here are stable positional indices ("server-0", ...),
 * displayed via each server's own `url`.
 */
export default function OpenAPIServers({ servers, selectedServer, onSelectServer }: OpenAPIServersProps) {
  const serverNames = servers.map((server, index) => server.url || keyForIndex(index));
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const isValidKey = (key: string | null | undefined): key is string =>
    !!key && indexForKey(key) >= 0 && indexForKey(key) < servers.length;

  const current = isValidKey(selectedServer) ? selectedServer : isValidKey(selected) ? selected : keyForIndex(0);
  const currentServer = servers[indexForKey(current)];

  const setCurrent = (serverKey: string) => {
    setSelected(serverKey);
    onSelectServer?.(serverKey);
  };

  const content = currentServer ? <OpenAPIServer {...currentServer} /> : null;

  return (
    <div className="flex justify-center w-full">
      <Section
        title={SERVER_TEXT}
        content={content}
        sideContent={
          <VerticalNavigation
            serverNames={serverNames}
            current={currentServer?.url || current}
            setCurrent={(name) => {
              const index = serverNames.indexOf(name);
              setCurrent(index >= 0 ? keyForIndex(index) : name);
            }}
          />
        }
        stickySideContent={true}
        reverseLayoutOnMobile={true}
      />
    </div>
  );
}
