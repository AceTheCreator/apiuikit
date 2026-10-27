import { createContext, useContext } from "react";
import { arazzoKeyAnchor } from "../../helpers/arazzoAnchors";

/**
 * How links inside the Arazzo page (goto actions, steps calling a workflow,
 * `dependsOn`) move to their target. The top-level layout also records the
 * selection, for deep links; a workflow from an Arazzo source shown inline
 * gets its own `scope`, so its links stay within that copy.
 */
export interface ArazzoLinksValue {
  scope: string;
  goTo: (key: string) => void;
  /** The selected workflow or step key, highlighted on the page. */
  selectedKey?: string | null;
}

export const scrollTo = (key: string, scope: string) => {
  document.getElementById(arazzoKeyAnchor(key, scope))?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const ArazzoLinksContext = createContext<ArazzoLinksValue>({ scope: "", goTo: (key) => scrollTo(key, "") });

export const useArazzoLinks = () => useContext(ArazzoLinksContext);
