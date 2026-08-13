import Section from "./Section";
import Tabs, { Tab } from "./Tabs";
import { useDocumentContext } from "../contexts";
import { getScrollLockTarget } from "../utils/scrollLock";

export type ContentTabItem = Tab;

interface ContentTabProps {
  tabs: ContentTabItem[];
  current: string | null;
  onChange: (id: string) => void;
}

export default function ContentTab({ tabs, current, onChange }: ContentTabProps) {
  const { rootElement, topOffset = 0 } = useDocumentContext();
  if (!tabs.length) {
    return null;
  }

  // `position: sticky` is relative to the nearest scroll container. The
  // host-navbar offset belongs to the document viewport; carrying it into an
  // embedded widget's own scroller would make the bar stop early and leave a
  // permanent gap above it.
  const stickyTop =
    typeof document !== "undefined" &&
    getScrollLockTarget(rootElement) === document.documentElement
      ? topOffset
      : 0;

  const content = (
    <div className="w-full mt-10 @lg:mt-0">
      <Tabs
        tabs={tabs}
        current={current}
        onChange={onChange}
        ariaLabel="AsyncAPI sections"
        selectLabel="Select an AsyncAPI section"
      />
    </div>
  );

  return (
    <div
      className="sticky z-10 flex w-full justify-center bg-background"
      style={{ top: stickyTop }}
    >
      <Section content={content} stickySideContent={false} />
    </div>
  );
}
