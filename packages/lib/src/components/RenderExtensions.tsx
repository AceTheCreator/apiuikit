import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { catalog } from "x-tensions";
import type { ExtensionComponent } from "x-tensions";
import { useAsyncAPIDocument } from "../contexts";

const RESERVED_PREFIXES = [/^x-parser-/i, /^x-lib-/i];

function isReservedExtensionKey(key: string): boolean {
  return RESERVED_PREFIXES.some((pattern) => pattern.test(key));
}

const lazyCache = new Map<string, ComponentType<{ value: unknown; path: string }>>();

function getLazyExtension(key: string): ExtensionComponent {
  let cached = lazyCache.get(key);
  if (!cached) {
    cached = lazy(catalog[key]);
    lazyCache.set(key, cached);
  }
  return cached as ExtensionComponent;
}

/**
 * View of an object's x-* spec-extension fields. Values are `unknown` because
 * extension payloads are arbitrary JSON, validated at runtime by the extension
 * component that renders them. Spec object types declare no x-* keys (and no
 * index signature), so they can't assign to this directly; extension readers
 * accept `object` and narrow through `getExtension` / the key scan instead of
 * making every caller cast.
 */
export type ExtensionSource = { [key: `x-${string}`]: unknown };

const isExtensionKey = (key: string): key is `x-${string}` => key.startsWith("x-");

/** Reads one x-* field off any spec object, e.g. `getExtension(info, "x-logo")`. */
export const getExtension = (source: object | undefined, key: `x-${string}`): unknown =>
  source ? (source as ExtensionSource)[key] : undefined;

interface RenderExtensionsProps {
  /** The object to scan for x-* fields, e.g. the `info` object. */
  source: object | undefined;
  /** Prefix for each matched extension's `path` prop, e.g. "info". */
  pathPrefix: string;
}

/**
 * Scans `source`'s own keys for x-* spec-extension fields the `x-tensions`
 * catalog knows how to render, and lazily loads + renders each match (via
 * `React.lazy`, so an extension's code is only fetched when its key actually
 * appears in a document). Unmatched x-* keys, and the library's own internal
 * bookkeeping markers (`x-parser-*`, `x-lib-*`), render nothing.
 */
export function RenderExtensions({ source, pathPrefix }: RenderExtensionsProps) {
  const { showExtensions } = useAsyncAPIDocument();

  if (!showExtensions || !source) return null;

  const matches = Object.keys(source).filter(
    (key): key is `x-${string}` =>
      isExtensionKey(key) &&
      !isReservedExtensionKey(key) &&
      Object.prototype.hasOwnProperty.call(catalog, key),
  );

  if (matches.length === 0) return null;

  return (
    <>
      {matches.map((key) => {
        const LazyExtension = getLazyExtension(key);
        return (
          <Suspense key={key} fallback={null}>
            <LazyExtension value={getExtension(source, key)} path={`${pathPrefix}.${key}`} />
          </Suspense>
        );
      })}
    </>
  );
}

export default RenderExtensions;
