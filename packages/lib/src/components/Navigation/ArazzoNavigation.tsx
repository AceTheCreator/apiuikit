import { useMemo } from "react";
import { defineNavSection, ErasedNavSection } from "./Navigation";
import SpecNavigation from "./SpecNavigation";
import { infoNavSection } from "./sharedSections";
import MethodBadge from "../MethodBadge";
import IconOperation from "../../icons/Operation";
import IconConnection from "../../icons/Connection";
import { arazzoKeyAnchor, sourceAnchor, stepKey, workflowKey } from "../../helpers/arazzoAnchors";
import type { ArazzoSource, ArazzoWorkflow } from "../../types/arazzo";
import type { HttpMethod } from "../../types/openapi";

export type ArazzoNavTab = "workflows";
export type ArazzoNavSectionId = ArazzoNavTab | "servers" | "info";

interface ArazzoNavigationProps {
  workflows?: ArazzoWorkflow[];
  sources?: ArazzoSource[];
  hasInfo?: boolean;
  activeTab: ArazzoNavSectionId | null;
  onTabChange: (tab: ArazzoNavTab) => void;
  onItemSelect?: (tab: ArazzoNavTab, key: string) => void;
  onSelectSource?: (key: string) => void;
  selectedItem?: { tab: ArazzoNavSectionId; key: string } | null;
}

/** A workflow, or one of its steps listed beneath it. */
interface WorkflowNavItem {
  key: string;
  label: string;
  step?: { number: number; method?: HttpMethod };
}

const EMPTY_WORKFLOWS: ArazzoWorkflow[] = [];
const EMPTY_SOURCES: ArazzoSource[] = [];

/**
 * Navigation's shared mechanics have one level of items per section, so
 * steps are listed right after their workflow and indented, rather than
 * nested. Sources reuse the "servers" section slot: always on screen, above
 * the workflows, and scroll-to only.
 */
export default function ArazzoNavigation({
  workflows = EMPTY_WORKFLOWS,
  sources = EMPTY_SOURCES,
  hasInfo = true,
  activeTab,
  onTabChange,
  onItemSelect,
  onSelectSource,
  selectedItem,
}: ArazzoNavigationProps) {
  const sections: ErasedNavSection[] = useMemo(() => {
    const items: WorkflowNavItem[] = workflows.flatMap((workflow) => [
      { key: workflowKey(workflow.workflowId), label: workflow.summary ?? workflow.workflowId },
      ...workflow.steps.map((step, index) => ({
        key: stepKey(workflow.workflowId, step.stepId),
        label: step.stepId,
        step: {
          number: index + 1,
          method: step.target.status === "linked" && step.target.kind === "operation" ? step.target.method : undefined,
        },
      })),
    ]);

    return [
      infoNavSection(hasInfo),
      defineNavSection<ArazzoSource>({
        id: "servers",
        label: "Sources",
        icon: IconConnection,
        isTab: false,
        items: sources,
        itemKey: (source) => source.name,
        targetId: (source) => sourceAnchor(source.name),
        renderItem: (source) => (
          <span className={`truncate ${source.status === "unresolved" ? "line-through decoration-foreground-muted" : ""}`}>
            {source.name}
          </span>
        ),
      }),
      defineNavSection<WorkflowNavItem>({
        id: "workflows",
        label: "Workflows",
        icon: IconOperation,
        items,
        itemKey: (item) => item.key,
        targetId: (item) => arazzoKeyAnchor(item.key),
        renderItem: (item) =>
          item.step ? (
            <span className="flex min-w-0 items-center gap-1.5 pl-3">
              <span className="shrink-0 tabular-nums text-foreground-muted">{item.step.number}.</span>
              {item.step.method && <MethodBadge method={item.step.method} size="xs" className="shrink-0" />}
              <span className="truncate">{item.label}</span>
            </span>
          ) : (
            <span className="truncate font-medium">{item.label}</span>
          ),
      }),
    ];
  }, [workflows, sources, hasInfo]);

  return (
    <SpecNavigation<ArazzoNavTab>
      sections={sections}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onItemSelect={onItemSelect}
      onSelectServer={onSelectSource}
      selectedItem={selectedItem}
    />
  );
}
