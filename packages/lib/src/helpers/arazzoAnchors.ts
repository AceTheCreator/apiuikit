/*
 * Selection keys and DOM anchor ids for the Arazzo page. A key names a
 * workflow (`apply-coupon`) or one of its steps (`apply-coupon/find-pet`);
 * it's what deep links, navigation and search carry. IDs are joined with `/`
 * because workflow and step IDs commonly contain `-` but shouldn't contain `/`.
 * "Shouldn't" is only a validation warning, so each ID is URI-encoded in the
 * key: a workflow `work/flow` keys as `work%2Fflow`, and the separator stays
 * unambiguous. IDs of letters, digits, `-` and `_` encode to themselves, so
 * their keys are unchanged.
 *
 * `scope` keeps anchors unique when a workflow from an Arazzo source is shown
 * inline under a step: its anchors are prefixed with the step's, so the same
 * workflow rendered in two places never shares an id.
 */

export const workflowKey = (workflowId: string) => encodeURIComponent(workflowId);

export const stepKey = (workflowId: string, stepId: string) => `${encodeURIComponent(workflowId)}/${encodeURIComponent(stepId)}`;

/** A key part back to its ID. A malformed escape is left as written rather than thrown. */
function decodeKeyPart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/** Splits a key back into its workflow and (optional) step. */
export function parseArazzoKey(key: string): { workflowId: string; stepId?: string } {
  const slash = key.indexOf("/");
  return slash === -1
    ? { workflowId: decodeKeyPart(key) }
    : { workflowId: decodeKeyPart(key.slice(0, slash)), stepId: decodeKeyPart(key.slice(slash + 1)) };
}

export const workflowAnchor = (workflowId: string, scope = "") => `${scope}workflow-${workflowId}`;

export const stepAnchor = (workflowId: string, stepId: string, scope = "") => `${scope}step-${workflowId}/${stepId}`;

/** The DOM id of whatever `key` names. */
export function arazzoKeyAnchor(key: string, scope = ""): string {
  const { workflowId, stepId } = parseArazzoKey(key);
  return stepId === undefined ? workflowAnchor(workflowId, scope) : stepAnchor(workflowId, stepId, scope);
}

export const sourceAnchor = (name: string) => `source-${name}`;
