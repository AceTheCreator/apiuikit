import { ChannelAddress } from "../../components/ChannelAddress";
import Section from "../../components/Section";
import { SidePanel } from "../../components/SidePanel";
import CopyMarkdownButton from "../../components/CopyMarkdownButton";
import { useAsyncAPIDocument } from "../../contexts";
import { Operation_TEXT } from "../../contants";
import { Channel } from "../../types/asyncapi/Channel";
import { Parameter } from "../../types/asyncapi/Parameter";
import { Operation as OperationType } from "../../types/asyncapi/Operation";
import { OperationAction } from "../../types/asyncapi/OperationAction";
import { AsyncAPIDocumentData } from "../../types/schema";
import { asyncApiOperationToMarkdown } from "../../helpers/toMarkdown";
import Operation from "./Operation";

interface OperationsProps {
  operations: Record<string, OperationType>;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  /** Which collapsed section of the selected operation search navigated to. */
  focusSection?: string | null;
  showCopyMarkdown?: boolean;
}

export default function Operations({ operations, selectedKey = null, onSelectKey, focusSection = null, showCopyMarkdown }: OperationsProps) {
  const setSelectedKey = (key: string | null) => onSelectKey?.(key);
  const { document, deref } = useAsyncAPIDocument();
  const doc = document as AsyncAPIDocumentData;

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
    const isSend = op.action === OperationAction.SEND;
    const actionLabel = op.action?.toUpperCase() ?? "";
    const badgeClassName = isSend
      ? "bg-green-100 text-green-800"
      : op.action === OperationAction.RECEIVE
        ? "bg-blue-100 text-blue-800"
        : "bg-neutral-100 text-foreground-secondary";
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
        className={`group cursor-pointer ${isSelected ? "bg-neutral-50" : ""}`}
      >
        <td className="px-6 py-4 max-w-0 w-full group-hover:bg-neutral-50">
          {address && <ChannelAddress address={address} parameters={parameters} truncate />}
        </td>
        <td className="px-6 py-4 w-32 group-hover:bg-neutral-50">
          <div
            className={`inline-flex w-24 items-center justify-center px-2 py-1 text-center rounded-md text-xs font-medium uppercase ${badgeClassName}`}
          >
            {actionLabel}
          </div>
        </td>
        <td className="group-hover:bg-neutral-50" />
      </tr>
    );
  });

  const selectedChannel = selectedOp ? (selectedOp.channel as unknown as Channel) : null;
  const selectedIsSend = selectedOp?.action === OperationAction.SEND;
  const selectedBadgeClassName = selectedIsSend
    ? "bg-green-100 text-green-800"
    : selectedOp?.action === OperationAction.RECEIVE
      ? "bg-blue-100 text-blue-800"
      : "bg-neutral-100 text-foreground-secondary";
  const panelTitle =
    selectedOp && selectedChannel?.address ? (
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium uppercase ${selectedBadgeClassName}`}
        >
          {selectedOp.action}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <ChannelAddress
            address={selectedChannel.address}
            parameters={
              selectedChannel.parameters as unknown as Record<string, Parameter>
            }
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
            <th className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider" />
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
        />
      </div>

      <SidePanel
        isOpen={!!selectedOp}
        side="right"
        onClose={() => setSelectedKey(null)}
        title={panelTitle}
        headerActions={
          selectedOp && selectedKey && showCopyMarkdown ? (
            <CopyMarkdownButton
              getMarkdown={() => asyncApiOperationToMarkdown(doc, selectedKey, deref)}
              label="Copy operation for LLM"
            />
          ) : undefined
        }
      >
        {selectedOp && <Operation op={selectedOp} id={selectedKey} focusSection={focusSection} />}
      </SidePanel>
    </>
  );
}
