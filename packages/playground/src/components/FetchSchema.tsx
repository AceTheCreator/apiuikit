import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, SyntheticEvent } from 'react'
import { SUGGESTED_SCHEMAS } from '../data/suggestedSchemas'
import type { UiPalette } from '../theme'

interface FetchSchemaProps {
  palette: UiPalette
  onLoad: (text: string) => void
}

// GitHub's HTML blob pages don't send CORS headers (and aren't the raw file anyway) —
// rewrite them to the raw.githubusercontent.com equivalent, which does.
function toFetchableUrl(url: string): string {
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

export function FetchSchema({ palette, onLoad }: FetchSchemaProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const listboxId = useRef(`fetch-schema-suggestions-${Math.random().toString(36).slice(2)}`).current

  const suggestions = useMemo(() => {
    const query = url.trim().toLowerCase()
    if (!query) return SUGGESTED_SCHEMAS
    return SUGGESTED_SCHEMAS.filter(
      (s) => s.label.toLowerCase().includes(query) || s.url.toLowerCase().includes(query),
    )
  }, [url])

  const fetchSchema = async (targetUrl: string) => {
    const trimmed = targetUrl.trim()
    if (!trimmed) return

    // Bundled examples use a local:// URL that is not fetchable — reload from
    // the inline content instead of hitting the network.
    const local = SUGGESTED_SCHEMAS.find(
      (s) => s.url === trimmed && s.content !== undefined,
    )
    if (local) {
      setError(null)
      onLoad(local.content!)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(toFetchableUrl(trimmed))
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status} ${res.statusText}`)
      }
      const text = await res.text()
      // No local validation here — the doc editor parses via the real AsyncAPI parser
      // (JSON or YAML) and surfaces any issues as diagnostics.
      onLoad(text)
    } catch (err) {
      if (err instanceof TypeError) {
        // fetch() rejects with a generic TypeError for CORS failures and network errors alike,
        // without exposing the real reason to JS — the browser console has the specific cause.
        setError("Couldn't reach that URL — it may not allow cross-origin requests (CORS), or the host may be unreachable.")
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch document')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectSuggestion = (suggestion: { url: string; content?: string }) => {
    setUrl(suggestion.url)
    setIsOpen(false)
    setActiveIndex(-1)
    if (suggestion.content !== undefined) {
      // For local examples — load its text directly, nothing to fetch.
      setError(null)
      onLoad(suggestion.content)
      return
    }
    fetchSchema(suggestion.url)
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsOpen(false)
    fetchSchema(url)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(0)
        return
      }
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) return
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault()
        selectSuggestion(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
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
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
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
      </form>

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Suggested API documents"
          style={{
            position: 'absolute',
            top: 'calc(100% - 4px)',
            left: '8px',
            right: '8px',
            zIndex: 30,
            margin: 0,
            padding: '4px',
            listStyle: 'none',
            maxHeight: '260px',
            overflowY: 'auto',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.url}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // onMouseDown (not onClick) fires before the input's onBlur, so the
              // selection registers before the dropdown closes on blur.
              onMouseDown={(e) => {
                e.preventDefault()
                selectSuggestion(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                color: i === activeIndex ? palette.textPrimary : palette.textMuted,
                background: i === activeIndex ? palette.activeIndicator : 'transparent',
              }}
            >
              <div>{s.label}</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.url}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.75rem', color: palette.errorText }}>
          {error}
        </p>
      )}
    </div>
  )
}
