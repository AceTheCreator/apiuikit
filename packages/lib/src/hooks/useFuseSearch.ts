import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { SearchEntry } from "../helpers/searchIndex";

export interface UseSpecSearchOptions {
  threshold?: number;
  limit?: number;
  /** Delay before a query change triggers a search, in ms. Defaults to 150. */
  debounceMs?: number;
}

/** Shared debounce + Fuse setup behind useSpecSearch (AsyncAPI) and useOpenAPISearch — only the index-builder differs between specs. */
export function useFuseSearch<T>(
  document: T,
  buildIndex: (document: T) => SearchEntry[],
  options: UseSpecSearchOptions = {},
) {
  const [query, setQuery] = useState("");
  // `query` drives the input's own value, so it updates on every keystroke —
  // typing must never feel laggy. The actual Fuse search is expensive enough
  // on large specs (~27ms per call on a 6k-entry index, measured) to visibly
  // jank input if it ran on every keystroke with no debounce, so the search
  // itself runs off this separate, delayed copy instead.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceMs = options.debounceMs ?? 150;
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(handle);
  }, [query, debounceMs]);

  const searchIndex = useMemo(() => buildIndex(document), [document, buildIndex]);

  const fuse = useMemo(
    () =>
      new Fuse(searchIndex, {
        // `path`/`location` are breadcrumb strings built for display in the
        // results dropdown (e.g. "Schemas > User > properties > email") —
        // nobody searches for those literally, and scoring against them just
        // dilutes real matches: Fuse's reported score is a weighted blend
        // across every key, so a query that only matches deep in `text`
        // (e.g. an Authorization/security description) gets dragged toward
        // "no match" by two irrelevant non-matching keys, and can rank below
        // unrelated noise in a large spec. `name` is weighted highest since
        // an identifier match is the strongest "this is what you meant" signal.
        keys: [
          { name: "name", weight: 2 },
          { name: "text", weight: 1 },
        ],
        threshold: options.threshold ?? 0.3,
        ignoreLocation: true,
        // Fuse penalizes matches by field length by default (a BM25-style
        // norm), independently of `ignoreLocation` — and `text` is a large
        // composite blob by design, so a dead-on substring match there was
        // still scoring ~0.85 (barely better than "no match") purely for
        // being long, letting shorter, coincidental matches outrank it.
        ignoreFieldNorm: true,
        includeScore: true,
      }),
    [searchIndex, options.threshold],
  );

  const results = useMemo(
    () =>
      debouncedQuery.trim()
        ? fuse
            .search(debouncedQuery.trim(), { limit: options.limit ?? 20 })
            .map((result) => result.item)
        : [],
    [fuse, debouncedQuery, options.limit],
  );

  return {
    query,
    setQuery,
    results,
    searchIndex,
  };
}
