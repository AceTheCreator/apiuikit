import { ChannelAddress } from "../../components/ChannelAddress";
import Section, { type SectionLayout } from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import MethodBadge from "../../components/MethodBadge";
import { Operation_TEXT } from "../../contants";
import { Channel } from "../../types/asyncapi/Channel";
import { Parameter } from "../../types/asyncapi/Parameter";
import { Operation as OperationType } from "../../types/asyncapi/Operation";
import Operation from "./Operation";

interface OperationsProps {
  operations: Record<string, OperationType>;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  /** Which collapsed section of the selected operation search navigated to. */
  focusSection?: string | null;
  layout?: SectionLayout;
}

export default function Operations({ operations, selectedKey = null, onSelectKey, focusSection = null, layout }: OperationsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);

  if (!Object.keys(operations).length) {
    return null;
  }

  const selectedOp = selectedKey ? operations[selectedKey] : null;

  const operationList: React.ReactNode[] = Object.keys(operations).map((key) => {
    const op = operations[key];
    // $refs (e.g. op.channel) are already inlined by resolveDocument /
    // @asyncapi/parser before the document reaches any component.
    const channel = op.channel as unknown as Channel;
    const address = channel?.address;
    const parameters = channel?.parameters as unknown as Record<string, Parameter> | undefined;
    const actionLabel = op.action?.toUpperCase() ?? "";
    const isSelected = selectedKey === key;

    return (
      <tr
        key={key}
        id={`operation-${key}`}
        onClick={() => setSelectedKey(key)}
        // A <tr> isn't natively focusable or activatable — role/tabIndex/onKeyDown
        // make it reachable and operable by keyboard, matching the click behavior.
        role="button"
        tabIndex={0}
        aria-label={`${actionLabel || "Operation"} ${address ?? key}`}
        aria-current={isSelected ? "true" : undefined}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setSelectedKey(key);
        }}
        className={`cursor-pointer hover:bg-neutral-50 ${isSelected ? "bg-neutral-50" : ""}`}
      >
        <td className="px-6 py-4 max-w-0 w-full">
          {address && <ChannelAddress address={address} parameters={parameters} truncate />}
        </td>
        <td className="px-6 py-4 w-32">
          <MethodBadge method={op.action} className="w-24" />
        </td>
      </tr>
    );
  });

  const selectedChannel = selectedOp ? (selectedOp.channel as unknown as Channel) : null;
  const panelTitle =
    selectedOp && selectedChannel?.address ? (
      <div className="flex items-center gap-2 min-w-0">
        <MethodBadge method={selectedOp.action} />
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* Clipped to one line, same as the endpoint panel's header: a long
              channel address otherwise wraps and pushes the close button
              around. Its ellipsis peeks the full address on hover/focus. */}
          <ChannelAddress
            address={selectedChannel.address}
            parameters={
              selectedChannel.parameters as unknown as Record<string, Parameter>
            }
            truncate
            peek
          />
        </div>
      </div>
    ) : (
      selectedKey ?? "Operation"
    );

  const content = (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-100 w-full">
          <tr>
            <th className="px-6 py-5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Operation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Method
            </th>
          </tr>
        </thead>
        <tbody className="bg-surface divide-y divide-border">
          {operationList}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="flex justify-center w-full">
        <Section
          title={Operation_TEXT}
          content={content}
          stickySideContent={false}
          layout={layout}
        />
      </div>

      <SidePanel
        isOpen={!!selectedOp}
        side="right"
        onClose={() => setSelectedKey(null)}
        title={panelTitle}
      >
        {selectedOp && (
          // Remounts on every operation switch — see Paths.tsx's identical `key`.
          <Operation key={selectedKey} op={selectedOp} id={selectedKey} focusSection={focusSection} />
        )}
      </SidePanel>
    </>
  );
}
