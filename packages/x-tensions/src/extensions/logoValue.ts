const SAFE_URL_PATTERN = /^(https?:|data:image\/)/i;

export interface ResolvedLogo {
  url: string;
  altText?: string;
  backgroundColor?: string;
}

/**
 * Normalizes `x-logo`'s two accepted shapes (a bare URL string, or the
 * ReDoc-originated {url, altText, backgroundColor} object) into one shape,
 * or null if `value` doesn't resolve to a safe, renderable URL. Exported so
 * callers can synchronously check "will this render a logo" without waiting
 * on LogoExtension's lazy chunk to load.
 */
export function resolveLogo(value: unknown): ResolvedLogo | null {
  const isBareUrl = typeof value === "string";
  if (!isBareUrl && (typeof value !== "object" || value === null)) return null;

  const { url, altText, backgroundColor } = isBareUrl
    ? { url: value, altText: undefined, backgroundColor: undefined }
    : (value as { url?: unknown; altText?: unknown; backgroundColor?: unknown });

  if (typeof url !== "string" || !SAFE_URL_PATTERN.test(url)) return null;

  return {
    url,
    altText: typeof altText === "string" && altText ? altText : undefined,
    backgroundColor: typeof backgroundColor === "string" ? backgroundColor : undefined,
  };
}
