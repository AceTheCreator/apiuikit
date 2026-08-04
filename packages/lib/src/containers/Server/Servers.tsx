import Section from "../../components/Section";
import { Server as ServerInterface } from "../../types/asyncapi/Server";
import VerticalNavigation from "../../components/VerticalNavigation";
import { useState } from "react";
import Server from "./Server";
import { SERVER_TEXT } from "../../contants";

interface ServersProps {
  servers: Record<string, ServerInterface>;
  selectedServer?: string | null;
  onSelectServer?: (serverName: string) => void;
  /** Which collapsed section of the selected server search navigated to. */
  focusSection?: string | null;
}

export default function Servers({ servers, selectedServer, onSelectServer, focusSection = null }: ServersProps) {
  const serverNames = Object.keys(servers);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  // Prefers the caller-controlled selection (e.g. from search); falls back to
  // uncontrolled local state, then to the first server if neither is set yet or
  // the previously selected one no longer exists (e.g. after switching documents).
  const current = [selectedServer, selected].find(
    (name): name is string => !!name && serverNames.includes(name),
  ) ?? serverNames[0];

  const setCurrent = (serverName: string) => {
    setSelected(serverName);
    onSelectServer?.(serverName);
  };

  const content = (
    <Server
      {...servers[current]}
      serverKey={current}
      focusSection={selectedServer || selected ? focusSection : null}
    />
  );
  return (
    <div className="flex justify-center w-full">
      <Section
        title={SERVER_TEXT}
        content={content}
        sideContent={
          <VerticalNavigation
            serverNames={serverNames}
            current={current}
            setCurrent={setCurrent}
          />
        }
        stickySideContent={true}
        reverseLayoutOnMobile={true}
      />
    </div>
  );
}
