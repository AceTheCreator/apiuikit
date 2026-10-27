import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { SUGGESTED_SCHEMAS, loadExampleWorkspace } from '../data/suggestedSchemas'
import type { SuggestedSchema } from '../data/suggestedSchemas'
import { followableSources } from '../utils/arazzoSources'
import type { FollowableSource } from '../utils/arazzoSources'
import { fetchDocumentText } from '../utils/fetchDocument'
import { detectSpecType, fileNameFromUrl } from '../utils/workspace'
import type { Workspace, WorkspaceFile } from '../utils/workspace'
import { ExamplesMenu } from './ExamplesMenu'
import type { UiPalette } from '../theme'

interface FetchSchemaProps {
  palette: UiPalette
  /** A fetched URL, as a file named after it. The playground decides where it goes, and returns the name it got. */
  onLoadDocument: (file: WorkspaceFile) => string
  /**
   * Adds the sources fetched for an Arazzo document. A file that already
   * exists with different content is kept unless `replace`; returns the names
   * of the files kept.
   */
  onAddSources: (files: WorkspaceFile[], replace: boolean) => string[]
  /** An example — always a complete workspace that replaces the current one. */
  onLoadWorkspace: (workspace: Workspace) => void
  /** Shown under the field: what a fetch will do to the workspace. */
  hint?: string
}

/** An Arazzo document just fetched, whose sources can be fetched next to it. */
type SourcesOffer = { sources: FollowableSource[]; skipped: string[] }

/** What fetching the sources did, and the files it kept rather than replace. */
type SourcesOutcome = { messages: string[]; kept: WorkspaceFile[] }

export function FetchSchema({ palette, onLoadDocument, onAddSources, onLoadWorkspace, hint }: FetchSchemaProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offer, setOffer] = useState<SourcesOffer | null>(null)
  const [outcome, setOutcome] = useState<SourcesOutcome | null>(null)

  const run = async (task: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    setOffer(null)
    setOutcome(null)
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch document')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchema = (targetUrl: string) => {
    const trimmed = targetUrl.trim()
    if (!trimmed) return

    // Bundled examples use a local:// URL that is not fetchable — load the
    // example itself instead of hitting the network.
    const local = SUGGESTED_SCHEMAS.find(
      (s) => s.url === trimmed && (s.content !== undefined || s.files !== undefined),
    )
    if (local) return run(async () => onLoadWorkspace(await loadExampleWorkspace(local, fetchDocumentText)))

    return run(async () => {
      const content = await fetchDocumentText(trimmed)
      const name = onLoadDocument({ name: fileNameFromUrl(trimmed, content), content })
      if (detectSpecType(content) !== 'arazzo') return
      // Relative source urls can't be loaded from the playground — offer to
      // fetch them from next to the document, into files that match them.
      const next = followableSources(content, trimmed, name)
      if (next.sources.length > 0 || next.skipped.length > 0) setOffer(next)
    })
  }

  const fetchSources = ({ sources, skipped }: SourcesOffer) =>
    run(async () => {
      const results = await Promise.allSettled(sources.map((source) => fetchDocumentText(source.url)))
      const files: WorkspaceFile[] = []
      const messages: string[] = []
      results.forEach((result, i) => {
        const { name, url: sourceUrl, fileName } = sources[i]
        if (result.status === 'fulfilled') files.push({ name: fileName, content: result.value })
        else messages.push(`Couldn’t fetch source “${name}” from ${sourceUrl}: ${(result.reason as Error).message}`)
      })
      const kept = new Set(onAddSources(files, false))
      const added = files.length - kept.size
      if (added > 0) messages.unshift(`Added ${added} source ${added === 1 ? 'file' : 'files'} to the workspace.`)
      if (skipped.length > 0) {
        messages.push(`Not fetched: ${skipped.map((name) => `“${name}”`).join(', ')}. Their urls point outside the workspace, or aren’t usable file names.`)
      }
      setOutcome({ messages, kept: files.filter((file) => kept.has(file.name)) })
    })

  const selectExample = (example: SuggestedSchema) => {
    // Bundled and multi-file examples clear the field rather than filling it
    // with a `local://` pseudo-URL, which isn't fetchable and wouldn't survive
    // a press of Fetch. A remote single-file example leaves its URL in the
    // field so it's clear where the document came from, and re-fetchable.
    const isRemote = example.content === undefined && example.files === undefined
    setUrl(isRemote ? example.url : '')
    run(async () => onLoadWorkspace(await loadExampleWorkspace(example, fetchDocumentText)))
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    fetchSchema(url)
  }

  const disabled = loading || !url.trim()

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        borderBottom: `1px solid ${palette.chromeBorder}`,
        background: palette.chromeBg,
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px' }}>
        <input
          type="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/spec.json or .yaml"
          aria-label="API document URL"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.35rem 0.6rem',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '6px',
            background: 'transparent',
            color: palette.textPrimary,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={disabled}
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '6px',
            background: 'transparent',
            color: palette.textMuted,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Fetching…' : 'Fetch'}
        </button>
        <ExamplesMenu palette={palette} onSelect={selectExample} />
      </form>

      {offer && !loading && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: palette.textPrimary }}>
          <span>
            {offer.sources.length > 0
              ? `This Arazzo document reads ${offer.sources.length} ${offer.sources.length === 1 ? 'source' : 'sources'} from next to it.`
              : 'This Arazzo document’s sources can’t be fetched into the workspace.'}
          </span>
          {offer.sources.length > 0 && (
            <button type="button" onClick={() => fetchSources(offer)} style={smallButtonStyle(palette)}>
              Fetch {offer.sources.length === 1 ? 'it' : 'them'} too
            </button>
          )}
          <button type="button" onClick={() => setOffer(null)} style={smallButtonStyle(palette)}>
            {offer.sources.length > 0 ? 'Not now' : 'Dismiss'}
          </button>
        </div>
      )}

      {outcome && !loading && (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: palette.textPrimary }}>
          {outcome.messages.map((message) => (
            <p key={message} style={{ margin: 0 }}>
              {message}
            </p>
          ))}
          {outcome.kept.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>
                Kept your {outcome.kept.map((file) => `“${file.name}”`).join(', ')}, which{' '}
                {outcome.kept.length === 1 ? 'differs' : 'differ'} from the fetched {outcome.kept.length === 1 ? 'one' : 'ones'}.
              </span>
              <button
                type="button"
                onClick={() => {
                  onAddSources(outcome.kept, true)
                  setOutcome({ messages: [`Replaced ${outcome.kept.length === 1 ? 'it' : 'them'} with the fetched ${outcome.kept.length === 1 ? 'file' : 'files'}.`], kept: [] })
                }}
                style={smallButtonStyle(palette)}
              >
                Replace with fetched
              </button>
            </div>
          )}
          <button type="button" onClick={() => setOutcome(null)} style={{ ...smallButtonStyle(palette), alignSelf: 'flex-start' }}>
            Dismiss
          </button>
        </div>
      )}

      {hint && !error && !offer && !outcome && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: palette.textMuted }}>{hint}</p>
      )}

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.75rem', color: palette.errorText }}>
          {error}
        </p>
      )}
    </div>
  )
}

function smallButtonStyle(palette: UiPalette) {
  return {
    padding: '0.15rem 0.5rem',
    fontSize: '0.75rem',
    fontFamily: 'inherit',
    border: `1px solid ${palette.chromeBorder}`,
    borderRadius: '6px',
    background: 'transparent',
    color: palette.textPrimary,
    cursor: 'pointer',
  } as const
}
