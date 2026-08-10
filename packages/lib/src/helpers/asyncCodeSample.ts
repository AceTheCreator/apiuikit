import { AsyncSnippet, getCompatibleTargets, type AsyncApiDocument } from "asyncsnippet";

export const DEFAULT_ASYNC_CODE_SAMPLE_TARGET = "javascript";
export const DEFAULT_ASYNC_CODE_SAMPLE_CLIENT = "ws";

export type AsyncCodeSampleTarget = ReturnType<typeof getCompatibleTargets>[number];

/** Every target/client asyncsnippet can actually generate for this specific
 * operation (JS/`ws`, JS/browser `WebSocket`, Python/`websockets`, ...) —
 * the data source for the language/library dropdown, mirroring
 * `@readme/httpsnippet`'s `availableTargets()` used for OpenAPI's own
 * dropdown. Pre-filtered by protocol (via asyncsnippet's
 * `getCompatibleTargets`) rather than the full global registry: the
 * registry mixes clients for different protocols (`ws`, `kafka`, ...) under
 * one flat list, and an operation is only ever reachable over one of them —
 * showing the rest would let a user pick an option guaranteed to fail and
 * blank the panel. Read from the registry rather than hardcoded so newly
 * `addTarget`/`addTargetClient`-registered entries show up without a code
 * change here. */
export function getAvailableAsyncCodeSampleTargets(
  document: unknown,
  operationId: string,
): AsyncCodeSampleTarget[] {
  return getCompatibleTargets(document as AsyncApiDocument, operationId);
}

/** Generates a single target/client code sample for an AsyncAPI operation via
 * asyncsnippet. Fails soft: an operation outside asyncsnippet's scope today
 * (no matching channel binding for that client's protocol, or a message with
 * no explicit example) resolves to `null` rather than throwing, so the panel
 * just doesn't render instead of crashing — the same convention as OpenAPI's
 * `generateSnippet`. */
export function generateAsyncCodeSample(
  document: unknown,
  operationId: string,
  targetId: string,
  clientId: string,
): string | null {
  try {
    const generator = new AsyncSnippet(document as AsyncApiDocument);
    return generator.convert(operationId, targetId, clientId);
  } catch {
    return null;
  }
}

/** Picks the target/client the "Example" dropdown should open on for a given
 * operation, out of `targets` (expected to already be pre-filtered to
 * protocol-compatible options via `getAvailableAsyncCodeSampleTargets`).
 * Tries each in order and opens on the first one that actually produces a
 * snippet — a compatible protocol doesn't guarantee generation succeeds
 * (e.g. a message with no example and no generatable schema fails for every
 * client identically), so this still can't just take `targets[0]` blindly.
 * Falls back to the fixed `javascript:ws` default so the dropdown still has
 * a sensible starting value when `targets` is empty (the panel won't render
 * in that case regardless). */
export function pickDefaultAsyncCodeSampleSelection(
  document: unknown,
  operationId: string | null,
  targets: AsyncCodeSampleTarget[],
): string {
  if (operationId) {
    for (const target of targets) {
      for (const client of target.clients) {
        if (generateAsyncCodeSample(document, operationId, target.key, client.key) !== null) {
          return `${target.key}:${client.key}`;
        }
      }
    }
  }
  return `${DEFAULT_ASYNC_CODE_SAMPLE_TARGET}:${DEFAULT_ASYNC_CODE_SAMPLE_CLIENT}`;
}
