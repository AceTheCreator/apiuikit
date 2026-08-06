import type { UiPalette } from '../theme'

interface ViewToggleProps {
  expanded: boolean
  palette: UiPalette
  onChange: (expanded: boolean) => void
}

export function ViewToggle({ expanded, palette, onChange }: ViewToggleProps) {
  // Both states are labeled buttons: an unlabeled icon gave a first-time
  // visitor no hint the page is editable at all, and once you've named one
  // direction of a toggle, naming the other keeps the control legible rather
  // than turning into a mystery icon on the way back.
  // Each label names where the button takes you, not what it takes away.
  const label = expanded ? 'Preview the docs full width' : 'Edit this document'

  return (
    <button
      type="button"
      onClick={() => onChange(!expanded)}
      aria-label={label}
      aria-pressed={expanded}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '28px',
        padding: '0 10px',
        border: `1px solid ${palette.chromeBorder}`,
        borderRadius: '6px',
        background: 'transparent',
        color: palette.textPrimary,
        font: 'inherit',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {expanded ? (
        <>
          {/* An eye, to match "Preview" — the collapse arrows would have said
              "shrink this" while the word says "go look at it". */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Preview</span>
        </>
      ) : (
        <>
          {/* `</>` rather than the four-corners glyph, which reads as fullscreen. */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
          </svg>
          <span>Edit</span>
        </>
      )}
    </button>
  )
}
