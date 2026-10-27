// GitHub's HTML blob pages don't send CORS headers (and aren't the raw file anyway) —
// rewrite them to the raw.githubusercontent.com equivalent, which does.
export function toFetchableUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'github.com') return url

    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/)
    if (!match) return url

    const [, owner, repo, ref, path] = match
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`
  } catch {
    return url
  }
}

// Remote JSON is often served minified, which lands in the editor as a single
// line. Pretty-print it when it parses; YAML and malformed JSON pass through
// untouched so the editor's diagnostics still point at the original text.
export function formatFetchedText(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export type FetchText = (url: string) => Promise<string>

/**
 * Fetches a document for the editor. Errors carry a message fit to show the
 * user as-is.
 */
export const fetchDocumentText: FetchText = async (url) => {
  let res: Response
  try {
    res = await fetch(toFetchableUrl(url))
  } catch (err) {
    if (err instanceof TypeError) {
      // fetch() rejects with a generic TypeError for CORS failures and network errors alike,
      // without exposing the real reason to JS — the browser console has the specific cause.
      throw new Error("Couldn't reach that URL — it may not allow cross-origin requests (CORS), or the host may be unreachable.")
    }
    throw err
  }
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status} ${res.statusText}`)
  }
  // No local validation here — the renderer parses via the real spec parser
  // (JSON or YAML) and surfaces any issues as diagnostics.
  return formatFetchedText(await res.text())
}
