export type Deref = (ref: string) => unknown;

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
  typeof value === "object" && value !== null;

function decodePointerToken(token: string): string | undefined {
  try {
    return decodeURIComponent(token).replace(/~1/g, "/").replace(/~0/g, "~");
  } catch {
    return undefined;
  }
}

/** Resolves an RFC 6901 JSON Pointer fragment against a document. */
export function resolveLocalPointer(root: unknown, ref: string): unknown {
  if (ref === "#") return root;
  if (!ref.startsWith("#/")) return undefined;

  let current: unknown = root;
  for (const token of ref.slice(2).split("/")) {
    if (!isContainer(current)) return undefined;
    const key = decodePointerToken(token);
    if (key === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
    if (current === undefined) return undefined;
  }
  return current;
}

/** Creates a document-scoped resolver that caches hits and misses. */
export function createDocumentDeref(document: unknown): Deref {
  const cache = new Map<string, unknown>();
  return (ref: string) => {
    if (cache.has(ref)) return cache.get(ref);
    const value = resolveLocalPointer(document, ref);
    cache.set(ref, value);
    return value;
  };
}
