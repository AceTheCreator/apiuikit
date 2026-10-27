import { useState } from 'react'
import type { CSSProperties, SyntheticEvent } from 'react'
import { matchedFile } from '../utils/arazzoSources'
import type { SourceMatch } from '../utils/arazzoSources'
import type { UiPalette } from '../theme'

/** A source fetched from its absolute `url`, because no workspace file matches it. */
export type RemoteSource =
  | { status: 'loading' }
  | { status: 'loaded'; content: string }
  | { status: 'failed'; message: string }

export interface SourceRow {
  match: SourceMatch
  /** Set for an absolute `url` with no matching file. */
  remote?: RemoteSource
  /** Why the library couldn't use the document it got (wrong type, unparseable, …). */
  problem?: string
}

interface SourcesPanelProps {
  palette: UiPalette
  rows: SourceRow[]
  onOpenFile: (name: string) => void
  /** Adds a file; returns why it couldn't, or null. Never replaces an existing file. */
  onAddFile: (name: string, content: string) => string | null
  /** Fetches a document's text; rejects with a message fit to show as-is. */
  fetchText: (url: string) => Promise<string>
  onRetry: (url: string) => void
}

type Status = { label: string; tone: 'ok' | 'pending' | 'problem'; detail?: string }

function rowStatus({ match, remote, problem }: SourceRow): Status {
  // A file or fetch was found, but the library couldn't use it.
  const withProblem = (status: Status): Status => (problem ? { label: 'Can’t be read', tone: 'problem', detail: problem } : status)
  if (match.kind === 'no-url') return { label: 'No url', tone: 'problem', detail: 'Give it a url so it can be matched to a file.' }
  if (match.kind === 'relative' && match.fileName === null) {
    return { label: 'Outside the workspace', tone: 'problem', detail: `“${match.url}” points above the workspace’s top folder.` }
  }
  if (matchedFile(match)) return withProblem({ label: 'In workspace', tone: 'ok' })
  if (match.kind === 'relative') {
    return { label: 'Missing', tone: 'problem', detail: `No file “${match.fileName}” in the workspace.` }
  }
  if (!remote || remote.status === 'loading') return { label: 'Fetching…', tone: 'pending' }
  if (remote.status === 'failed') return { label: 'Couldn’t fetch', tone: 'problem', detail: remote.message }
  return withProblem({ label: 'Fetched', tone: 'ok' })
}

/** The file a fix creates, so that it matches the source afterwards. */
const targetFile = (match: SourceMatch): string | null => (match.kind === 'no-url' ? null : match.fileName)

const isProblem = (row: SourceRow) => rowStatus(row).tone === 'problem'

function summary(rows: SourceRow[]): string {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const { label } = rowStatus(row)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts].map(([label, count]) => `${count} ${label.toLowerCase()}`).join(', ')
}

type Editing = { index: number; mode: 'paste' | 'fetch' } | null

/**
 * Every source description of the Arazzo entry file, where its document comes
 * from, and how to fix the ones that can't be loaded. Collapsed to one line
 * while every source loads; opens by itself when one doesn't.
 */
export function SourcesPanel({ palette, rows, onOpenFile, onAddFile, fetchText, onRetry }: SourcesPanelProps) {
  const problems = rows.filter(isProblem).length
  // Until the user toggles it, the panel follows whether anything needs fixing.
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null)
  const expanded = userExpanded ?? problems > 0
  const [editing, setEditing] = useState<Editing>(null)

  if (rows.length === 0) return null

  const buttonStyle: CSSProperties = {
    padding: '0.15rem 0.5rem',
    fontSize: '0.75rem',
    fontFamily: 'inherit',
    border: `1px solid ${palette.chromeBorder}`,
    borderRadius: '6px',
    background: 'transparent',
    color: palette.textPrimary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
  const toneColor = { ok: palette.textMuted, pending: palette.textMuted, problem: palette.errorText }

  return (
    <section
      aria-label="Sources"
      style={{
        borderTop: `1px solid ${palette.chromeBorder}`,
        background: palette.chromeBg,
        color: palette.textPrimary,
        fontSize: '0.75rem',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
    >
      <style>{`
        .playground-sources button:hover:not(:disabled) { color: ${palette.hoverText}; border-color: ${palette.textMuted}; }
        .playground-sources button:focus-visible { outline: 2px solid ${palette.focusRing}; outline-offset: 1px; }
        .playground-sources-file:hover { text-decoration: underline; }
      `}</style>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="playground-sources-list"
        onClick={() => setUserExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '0.35rem 0.75rem',
          border: 'none',
          background: 'transparent',
          color: palette.textPrimary,
          fontSize: '0.75rem',
          fontFamily: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 150ms ease' }}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <strong style={{ fontWeight: 600 }}>Sources</strong>
        <span style={{ color: problems > 0 ? palette.errorText : palette.textMuted }}>{summary(rows)}</span>
      </button>

      {expanded && (
        <ul
          id="playground-sources-list"
          className="playground-sources"
          aria-label="Source descriptions"
          style={{ listStyle: 'none', margin: 0, padding: '0 0.75rem 0.5rem', maxHeight: '220px', overflowY: 'auto' }}
        >
          {rows.map((row) => {
            const { match, remote } = row
            const status = rowStatus(row)
            const file = targetFile(match)
            const isEditing = editing?.index === match.index
            const found = matchedFile(match) !== null
            const canFix = status.tone === 'problem' && !found && file !== null
            return (
              <li key={match.index} style={{ padding: '0.4rem 0', borderTop: `1px solid ${palette.chromeBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <code style={{ fontWeight: 600 }}>{match.name}</code>
                  {match.url && (
                    <span title={match.url} style={{ color: palette.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 8rem' }}>
                      {match.url}
                    </span>
                  )}
                  <span style={{ color: toneColor[status.tone], marginLeft: 'auto', whiteSpace: 'nowrap' }}>{status.label}</span>
                </div>
                {status.detail && <p style={{ margin: '0.2rem 0 0', color: palette.errorText }}>{status.detail}</p>}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                  {found && file && (
                    <button type="button" className="playground-sources-file" style={buttonStyle} onClick={() => onOpenFile(file)} title={`Open ${file}`}>
                      Open {file}
                    </button>
                  )}
                  {remote?.status === 'loaded' && file && (
                    <button
                      type="button"
                      style={buttonStyle}
                      title={`Add the fetched document as ${file}, so it can be edited and works offline`}
                      onClick={() => {
                        const error = onAddFile(file, remote.content)
                        if (!error) onOpenFile(file)
                      }}
                    >
                      Save to workspace
                    </button>
                  )}
                  {remote?.status === 'failed' && match.url && (
                    <button type="button" style={buttonStyle} onClick={() => onRetry(match.url!)}>
                      Retry
                    </button>
                  )}
                  {canFix && (
                    <>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => {
                          if (!onAddFile(file, '')) onOpenFile(file)
                        }}
                      >
                        Add empty file
                      </button>
                      <button type="button" style={buttonStyle} aria-expanded={isEditing && editing.mode === 'paste'} onClick={() => setEditing(isEditing && editing.mode === 'paste' ? null : { index: match.index, mode: 'paste' })}>
                        Paste
                      </button>
                      <button type="button" style={buttonStyle} aria-expanded={isEditing && editing.mode === 'fetch'} onClick={() => setEditing(isEditing && editing.mode === 'fetch' ? null : { index: match.index, mode: 'fetch' })}>
                        Fetch from URL
                      </button>
                    </>
                  )}
                </div>
                {isEditing && file && (
                  <SourceForm
                    key={editing.mode}
                    mode={editing.mode}
                    palette={palette}
                    buttonStyle={buttonStyle}
                    fileName={file}
                    initialUrl={match.kind === 'absolute' && match.url ? match.url : ''}
                    fetchText={fetchText}
                    onCancel={() => setEditing(null)}
                    onDone={(content) => {
                      const error = onAddFile(file, content)
                      if (error) return error
                      setEditing(null)
                      onOpenFile(file)
                      return null
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

interface SourceFormProps {
  mode: 'paste' | 'fetch'
  palette: UiPalette
  buttonStyle: CSSProperties
  fileName: string
  initialUrl: string
  fetchText: (url: string) => Promise<string>
  onCancel: () => void
  /** Adds the file; returns why it couldn't, or null. */
  onDone: (content: string) => string | null
}

/** Pasting a document, or fetching one from another URL, into the file a source expects. */
function SourceForm({ mode, palette, buttonStyle, fileName, initialUrl, fetchText, onCancel, onDone }: SourceFormProps) {
  const [value, setValue] = useState(mode === 'fetch' ? initialUrl : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fieldStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.3rem 0.5rem',
    fontSize: '0.75rem',
    fontFamily: mode === 'paste' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
    border: `1px solid ${palette.chromeBorder}`,
    borderRadius: '6px',
    background: 'transparent',
    color: palette.textPrimary,
  }

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return
    setError(null)
    if (mode === 'paste') {
      setError(onDone(value))
      return
    }
    setBusy(true)
    try {
      const content = await fetchText(value.trim())
      setError(onDone(content))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch document')
    } finally {
      setBusy(false)
    }
  }

  const label = mode === 'paste' ? `Document to save as ${fileName}` : `URL to fetch into ${fileName}`
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.4rem' }}>
      {mode === 'paste' ? (
        <textarea aria-label={label} placeholder={label} value={value} onChange={(e) => setValue(e.target.value)} rows={5} autoFocus style={{ ...fieldStyle, resize: 'vertical' }} />
      ) : (
        <input type="url" aria-label={label} placeholder="https://example.com/openapi.yaml" value={value} onChange={(e) => setValue(e.target.value)} autoFocus style={fieldStyle} />
      )}
      {error && (
        <p role="alert" style={{ margin: 0, color: palette.errorText }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="submit" disabled={busy || !value.trim()} style={{ ...buttonStyle, opacity: busy || !value.trim() ? 0.6 : 1 }}>
          {mode === 'paste' ? `Save as ${fileName}` : busy ? 'Fetching…' : `Fetch into ${fileName}`}
        </button>
        <button type="button" onClick={onCancel} style={buttonStyle}>
          Cancel
        </button>
      </div>
    </form>
  )
}
