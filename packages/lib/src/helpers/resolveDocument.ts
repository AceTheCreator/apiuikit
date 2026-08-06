import { hasRef } from "../utils/hasRef";
import { resolveLocalPointer } from "./jsonPointer";

/**
 * Document normalization: every entry path (the without-parser components,
 * the section roots, and the with-parser renderers) funnels its document
 * through here, and downstream code relies on the output contract:
 *
 *   THE CONTRACT: the returned tree never contains object cycles, so
 *   JSON.stringify is always safe on any subtree (the JSON tab, example
 *   generation). Wherever full inlining would have produced a cycle, a
 *   `{ $ref: "#/..." }` node stands in instead; consumers resolve those
 *   lazily via the context's `deref` and the schema tree marks them circular.
 *
 * Two input shapes normalize into that contract:
 *
 * - `$ref`-carrying documents (the without-parser entry): every internal
 *   `{ $ref: "#/..." }` node is replaced by its resolved target, except refs
 *   whose target is currently being resolved higher up the same chain, which
 *   stay `$ref` nodes.
 *
 * - Already-dereferenced documents with real object cycles (parser output:
 *   @scalar/openapi-parser and @asyncapi/parser both inline recursive schemas
 *   as circular object references): each back-edge is replaced by a `$ref`
 *   node pointing at the JSON Pointer where its target first appears, cutting
 *   the cycle into the same shape the first case produces.
 *
 * The walk returns a NEW tree (the input is never mutated); documents already
 * meeting the contract (no refs, no cycles) pass through untouched, identity
 * included. Inlined targets are stamped with `x-parser-schema-id` (the ref's
 * last path segment) when they don't already carry one. This mirrors what
 * @asyncapi/parser leaves behind and is what the schema tree reads to show
 * referenced-schema name badges. The JSON tab already strips `x-parser-*`
 * markers before display.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Extracts the schema name from a JSON Pointer, e.g. "#/components/schemas/sentAt" → "sentAt". */
const refNameFromPath = (ref: string) =>
  ref.replace(/^#\//, "").split("/").pop() ?? ref;

/**
 * Read-only scan for `$ref` nodes only (not cycles). Used to verify a
 * caller's `kind="resolved"` promise: leftover refs mean their upstream
 * resolution isn't doing what they think, while object cycles are a normal
 * property of parser output and no broken promise. Terminates on cyclic
 * input via the visited set.
 */
export const containsRefs = (value: unknown, visited = new Set<object>()): boolean => {
  if (typeof value !== "object" || value === null) return false;
  if (visited.has(value)) return false;
  visited.add(value);
  if (hasRef(value)) return true;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.some((child) => containsRefs(child, visited));
};

/**
 * Cheap read-only scan for anything that needs normalizing: a `$ref` node, or
 * a real object cycle (a node reachable from itself, as in parser output for
 * recursive schemas). No copies, early exit on the first hit. Lets
 * resolveDocument return documents that already meet its contract untouched,
 * identity included, instead of paying for a full deep copy. `active` tracks
 * the current DFS path (a child found there is a cycle); `visited` skips
 * shared subtrees that were already cleared.
 */
const needsNormalization = (
  value: unknown,
  active = new Set<object>(),
  visited = new Set<object>(),
): boolean => {
  if (typeof value !== "object" || value === null) return false;
  if (active.has(value)) return true;
  if (visited.has(value)) return false;
  visited.add(value);
  if (hasRef(value)) return true;
  active.add(value);
  try {
    const children = Array.isArray(value) ? value : Object.values(value);
    return children.some((child) => needsNormalization(child, active, visited));
  } finally {
    active.delete(value);
  }
};

/** Encodes one path segment for a JSON Pointer, per RFC 6901 (~ first, then /). */
const encodePointerSegment = (segment: string) =>
  segment.replace(/~/g, "~0").replace(/\//g, "~1");

const toPointer = (path: string[]) =>
  path.length ? `#/${path.map(encodePointerSegment).join("/")}` : "#";

export function resolveDocument<T>(doc: T): T {
  // Input already meeting the contract (no refs, no cycles) passes through
  // with its identity intact — this is also what makes a caller-side
  // "already resolved" promise unnecessary: verifying costs a scan, not a copy.
  if (!needsNormalization(doc)) return doc;

  // Shared targets resolve to the same copy (keeps memory flat and lets two
  // reference sites stay identical objects).
  const copies = new Map<object, unknown>();
  // Source objects on the current walk path. A $ref whose target is one of
  // these would create a brand-new object cycle if inlined — whether the ref
  // points at an ancestor reached by plain traversal (a schema referencing
  // itself from its own definition) or through a chain of refs — so it stays
  // a `$ref` node. A plain child found here is an input object cycle (parser
  // output), re-ref'd into a `$ref` node via `pointers`.
  const active = new Set<object>();
  // First-encounter output location of every source container, used as the
  // `$ref` target when a back-edge to it must be cut. The pointer is valid
  // against the returned tree (deref walks the output document), because the
  // copy is embedded at that same path.
  const pointers = new Map<object, string>();

  const walk = (value: unknown, path: string[]): unknown => {
    if (Array.isArray(value)) {
      if (active.has(value)) return { $ref: pointers.get(value) };
      const existing = copies.get(value);
      if (existing !== undefined) return existing;
      const copy: unknown[] = [];
      pointers.set(value, toPointer(path));
      copies.set(value, copy);
      active.add(value);
      try {
        value.forEach((item, index) => copy.push(walk(item, [...path, String(index)])));
      } finally {
        active.delete(value);
      }
      return copy;
    }

    if (hasRef(value)) {
      const target = resolveLocalPointer(doc, value.$ref);
      const targetIsContainer = isRecord(target) || Array.isArray(target);
      if (targetIsContainer && !active.has(target)) {
        const resolved = walk(target, path);
        if (isRecord(resolved) && resolved["x-parser-schema-id"] === undefined) {
          resolved["x-parser-schema-id"] = refNameFromPath(value.$ref);
        }
        return resolved;
      }
      if (target !== undefined && !targetIsContainer) return target; // scalar
      // Circular (target is on the active path) or unresolvable: fall through
      // and keep the `$ref` node as-is (copied).
    }

    if (isRecord(value)) {
      if (active.has(value)) return { $ref: pointers.get(value) };
      const existing = copies.get(value);
      if (existing !== undefined) return existing;
      const copy: Record<string, unknown> = {};
      pointers.set(value, toPointer(path));
      copies.set(value, copy);
      active.add(value);
      try {
        for (const [key, val] of Object.entries(value)) {
          copy[key] = walk(val, [...path, key]);
        }
      } finally {
        active.delete(value);
      }
      return copy;
    }

    return value;
  };

  return walk(doc, []) as T;
}
