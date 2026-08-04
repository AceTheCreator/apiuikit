/**
 * OpenAPI runtime expressions (`$response.body#/id`) appear in response
 * `links` parameters and in `callbacks` URL keys. They're written with a `$`
 * sigil and a JSON Pointer (`#/a/b`), which is precise but hard to read mid
 * sentence, so both places show them as a plain dotted path instead.
 */

/** `$response.body#/data/id` reads as `response.body.data.id`. Non-expressions are left alone. */
export function readableExpression(value: unknown): string {
  if (typeof value !== "string") return JSON.stringify(value);
  if (!value.startsWith("$")) return value;
  return value.slice(1).replace(/#\//g, ".").replace(/\//g, ".");
}

/**
 * A callback's key is a URL template that embeds expressions in braces, and
 * may wrap them in literal URL text: `{$request.body#/callbackUrl}` or
 * `https://example.com/{$request.body#/id}/events`. Only the embedded
 * expressions are rewritten; the braces stay, since they mark the placeholder.
 */
export function readableCallbackUrl(url: string): string {
  return url.replace(/\{\$([^}]+)\}/g, (_match, expression: string) => {
    return `{${readableExpression(`$${expression}`)}}`;
  });
}
