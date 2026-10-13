import Section, { type SectionLayout } from "../../components/Section";
import ItemCard from "../../components/ItemCard";
import { Operation as OperationType } from "../../types/asyncapi/Operation";
import Operation from "./Operation";
import { OperationHeaderActions, OperationTitle } from "./OperationHeader";

interface OperationCardProps {
  operationKey: string;
  op: OperationType;
  layout?: SectionLayout;
}

/**
 * One AsyncAPI operation rendered inline: the header and detail the list's
 * side panel shows for it (Operations.tsx), framed as a card in the page flow.
 */
export default function OperationCard({ operationKey, op, layout }: OperationCardProps) {
  return (
    <div className="flex justify-center w-full">
      <Section
        stickySideContent={false}
        layout={layout}
        content={
          <ItemCard
            title={<OperationTitle op={op} operationKey={operationKey} />}
            headerActions={<OperationHeaderActions operationKey={operationKey} />}
          >
            <Operation op={op} id={operationKey} />
          </ItemCard>
        }
      />
    </div>
  );
}
