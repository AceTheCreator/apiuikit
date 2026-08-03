import { defineNavSection, ErasedNavSection } from "./Navigation";
import IconBookOpen from "../../icons/BookOpen";
import IconSchema from "../../icons/Schema";

/**
 * Section descriptors that are identical for every spec, shared by the
 * AsyncAPI and OpenAPI navigation adapters. Call these inside the adapter's
 * `sections` memo, they build a fresh descriptor per call.
 */

/** One tick that jumps to the top of the Info panel. */
export function infoNavSection(hasInfo: boolean): ErasedNavSection {
  return defineNavSection<string>({
    id: "info",
    label: "Info",
    icon: IconBookOpen,
    isTab: false,
    // A tick worth having (and worth tracking on scroll), but there's
    // nothing to expand into beyond "scroll to the top": no popover entry.
    showInPopover: false,
    items: hasInfo ? ["info"] : [],
    itemKey: () => "info",
    targetId: () => "info-panel",
    renderItem: () => <span className="truncate">Overview</span>,
  });
}

/** A plain name list targeting the `schema-${name}` anchors both specs render. */
export function schemasNavSection(schemas: Record<string, unknown>): ErasedNavSection {
  return defineNavSection<string>({
    id: "schemas",
    label: "Schemas",
    icon: IconSchema,
    items: Object.keys(schemas),
    itemKey: (name) => name,
    targetId: (name) => `schema-${name}`,
    renderItem: (name) => <span className="truncate">{name}</span>,
  });
}
