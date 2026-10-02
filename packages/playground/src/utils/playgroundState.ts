import LZString from 'lz-string'

/**
 * Everything needed to reproduce a playground session. `config` is the raw
 * config editor text rather than the parsed value, so a mid-edit (invalid)
 * config round-trips exactly.
 */
export interface PlaygroundSnapshot {
  v: 1
  doc: string
  config: string
}

const STATE_STORAGE_KEY = 'apiuikit-playground-state'
const SHARE_PARAM = 's'
// Matches the share function's cap (netlify/functions/share.mts).
const MAX_SHARE_BYTES = 5 * 1024 * 1024

export function isSnapshot(value: unknown): value is PlaygroundSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.v === 1 && typeof v.doc === 'string' && typeof v.config === 'string'
}

// Stored lz-string compressed: large specs (100k+ lines) would otherwise eat
// most of the ~5M-character per-origin localStorage quota.
export function readStoredSnapshot(): PlaygroundSnapshot | null {
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY)
    if (!stored) return null
    const parsed: unknown = JSON.parse(LZString.decompressFromUTF16(stored) ?? '')
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredSnapshot(snapshot: PlaygroundSnapshot): void {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, LZString.compressToUTF16(JSON.stringify(snapshot)))
  } catch {
    // Ignore quota / private-mode failures — the editor still works in-session.
  }
}

export function readShareId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(SHARE_PARAM)
  } catch {
    return null
  }
}

/** Drops `?s=` (keeping any other params) so a reload restores local edits, not the original share. */
export function clearShareId(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState(window.history.state, '', url)
}

function shareErrorMessage(status: number): string {
  if (status === 413) return 'Spec too large to share'
  if (status === 429) return 'Too many share requests — try again in a minute'
  if (status === 404) return 'Shared link not found'
  return `Share request failed (${status})`
}

/** Uploads the snapshot and returns the full share URL. */
export async function createShare(endpoint: string, snapshot: PlaygroundSnapshot): Promise<string> {
  const body = JSON.stringify(snapshot)
  // Checked up front so an oversized spec fails fast instead of uploading megabytes to be rejected.
  if (new Blob([body]).size > MAX_SHARE_BYTES) throw new Error(shareErrorMessage(413))
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  // A 404 here means the share endpoint itself is missing (e.g. the function
  // wasn't deployed), not a missing share.
  if (res.status === 404) throw new Error('Share service unavailable')
  if (!res.ok) throw new Error(shareErrorMessage(res.status))
  const { id } = (await res.json()) as { id: string }
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SHARE_PARAM, id)
  return url.toString()
}

export async function fetchShare(endpoint: string, id: string): Promise<PlaygroundSnapshot> {
  const res = await fetch(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(shareErrorMessage(res.status))
  const parsed: unknown = await res.json()
  if (!isSnapshot(parsed)) throw new Error('Shared link is malformed')
  return parsed
}
