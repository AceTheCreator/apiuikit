import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SHARE_TARGETS, SHARE_TEXT } from '../data/shareTargets'
import type { UiPalette } from '../theme'

type LinkState = { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error'; message: string }

interface ShareDialogProps {
  palette: UiPalette
  /** Uploads the current snapshot and resolves to the share URL. */
  onShare: () => Promise<string>
  onClose: () => void
}

const COPIED_RESET_MS = 2000

// Hover/focus states can't be expressed inline, so the dialog carries its own
// small stylesheet (same approach as scrollbarStyle in ../theme).
function dialogStyle(palette: UiPalette): string {
  return `
    .pg-share-target { transition: background 120ms ease, border-color 120ms ease; }
    .pg-share-target:hover { background: ${palette.activeIndicator}33; border-color: ${palette.textMuted}; }
    .pg-share-dialog button:focus-visible,
    .pg-share-dialog a:focus-visible { outline: 2px solid ${palette.focusRing}; outline-offset: 2px; }
    /* The input and Copy button read as one control, so ring them together. */
    .pg-share-field input:focus { outline: none; }
    .pg-share-field:focus-within { box-shadow: 0 0 0 2px ${palette.focusRing}; }
    .pg-share-copy:hover:not(:disabled) { background: ${palette.textPrimary}; color: ${palette.chromeBg}; }
  `
}

export function ShareDialog({ palette, onShare, onClose }: ShareDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<LinkState>({ status: 'loading' })
  const [copied, setCopied] = useState(false)

  const createLink = useCallback(() => {
    setLink({ status: 'loading' })
    onShare()
      .then((url) => setLink({ status: 'ready', url }))
      .catch((err: Error) => setLink({ status: 'error', message: err.message || 'Could not create share link' }))
  }, [onShare])

  // Mount-only: `onShare` is a fresh closure every Playground render, and a
  // re-render must not re-upload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(createLink, [])

  useEffect(() => {
    if (link.status === 'ready') inputRef.current?.select()
  }, [link])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    if (link.status !== 'ready') return
    let ok = false
    try {
      await navigator.clipboard.writeText(link.url)
      ok = true
    } catch {
      // Clipboard API unavailable (insecure context / denied) — fall back to the
      // selected input and the legacy copy command. execCommand returns false
      // (or throws) when the copy does not land on the clipboard.
      inputRef.current?.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
    }
    if (ok) setCopied(true)
  }

  // Esc closes; Tab cycles within the dialog so focus can't wander behind the backdrop.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled)',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const url = link.status === 'ready' ? link.url : null

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
    >
      <style>{dialogStyle(palette)}</style>
      <div
        ref={dialogRef}
        className="pg-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '20px',
          background: palette.chromeBg,
          color: palette.textPrimary,
          border: `1px solid ${palette.chromeBorder}`,
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Share playground
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: palette.textMuted,
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: palette.textMuted }}>
          Anyone with the link can view this document and config.
        </p>

        <div className="pg-share-field" style={{ display: 'flex', borderRadius: '8px' }}>
          <input
            ref={inputRef}
            readOnly
            aria-label="Share link"
            value={url ?? (link.status === 'loading' ? 'Creating link…' : '')}
            disabled={!url}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1,
              minWidth: 0,
              height: '36px',
              padding: '0 10px',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: url ? palette.textPrimary : palette.textMuted,
              background: 'transparent',
              border: `1px solid ${palette.chromeBorder}`,
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
            }}
          />
          <button
            type="button"
            className="pg-share-copy"
            onClick={copy}
            disabled={!url}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: palette.textPrimary,
              background: 'transparent',
              border: `1px solid ${palette.chromeBorder}`,
              borderRadius: '0 8px 8px 0',
              cursor: url ? 'pointer' : 'default',
              opacity: url ? 1 : 0.6,
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {copied ? (
                <path d="M20 6 9 17l-5-5" />
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
              )}
            </svg>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {link.status === 'error' && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginTop: '8px',
              fontSize: '13px',
              color: palette.errorText,
            }}
          >
            {link.message}
            <button
              type="button"
              onClick={createLink}
              style={{
                padding: '2px 8px',
                fontSize: '12px',
                color: palette.errorText,
                background: 'transparent',
                border: `1px solid ${palette.errorBorder}`,
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div style={{ margin: '20px 0 10px', fontSize: '12px', fontWeight: 600, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Share via
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
          {SHARE_TARGETS.map((target) => (
            <a
              key={target.id}
              className="pg-share-target"
              href={url ? target.buildUrl(url, SHARE_TEXT) : undefined}
              aria-disabled={!url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '38px',
                padding: '0 10px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                color: palette.textPrimary,
                textDecoration: 'none',
                border: `1px solid ${palette.chromeBorder}`,
                borderRadius: '8px',
                opacity: url ? 1 : 0.5,
                pointerEvents: url ? 'auto' : 'none',
              }}
            >
              <svg width="16" height="16" viewBox={target.viewBox} style={{ flexShrink: 0 }} fill={target.color ?? palette.textPrimary} aria-hidden="true">
                <path d={target.path} />
              </svg>
              {target.label}
            </a>
          ))}
          <a
            className="pg-share-target"
            href={url ? `mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${encodeURIComponent(url)}` : undefined}
            aria-disabled={!url}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '38px',
              padding: '0 10px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              color: palette.textPrimary,
              textDecoration: 'none',
              border: `1px solid ${palette.chromeBorder}`,
              borderRadius: '8px',
              opacity: url ? 1 : 0.5,
              pointerEvents: url ? 'auto' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }} fill="none" stroke={palette.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
            Email
          </a>
        </div>
      </div>
    </div>
  )
}
