import { useRef, useState } from 'react'
import { ShareDialog } from './ShareDialog'
import type { UiPalette } from '../theme'

interface ShareButtonProps {
  palette: UiPalette
  /** Uploads the current snapshot and resolves to the share URL. */
  onShare: () => Promise<string>
}

export function ShareButton({ palette, onShare }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Share this document and config (uploads them)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '28px',
          padding: '0 10px',
          fontSize: '13px',
          fontWeight: 500,
          border: `1px solid ${palette.chromeBorder}`,
          borderRadius: '6px',
          background: 'transparent',
          color: palette.textPrimary,
          cursor: 'pointer',
        }}
      >
        Share
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      </button>
      {open && <ShareDialog palette={palette} onShare={onShare} onClose={close} />}
    </>
  )
}
