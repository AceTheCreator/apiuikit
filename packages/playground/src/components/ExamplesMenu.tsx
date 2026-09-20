import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SUGGESTED_SCHEMAS } from '../data/suggestedSchemas'
import type { SuggestedSchema } from '../data/suggestedSchemas'
import type { UiPalette } from '../theme'

interface ExamplesMenuProps {
  palette: UiPalette
  onSelect: (schema: SuggestedSchema) => void
}

function CaretIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

/**
 * Picks one of the bundled or remote example documents.
 *
 * Deliberately a menu button rather than suggestions inside the URL field:
 * the field takes a URL, and browsing a catalogue of examples is a different
 * task that was only reachable by focusing an input the user meant to type
 * into. Separating them also lets the field behave like a plain URL input —
 * no popup opening on focus, no list covering the editor while typing.
 */
export function ExamplesMenu({ palette, onSelect }: ExamplesMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Focus follows the active item so screen readers announce it and typing
  // stays inside the menu. Runs after open/activeIndex settle rather than in
  // the handlers, which would fight React's own commit ordering.
  useEffect(() => {
    if (!open) return
    itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  const choose = (schema: SuggestedSchema) => {
    close(true)
    onSelect(schema)
  }

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setActiveIndex(event.key === 'ArrowDown' ? 0 : SUGGESTED_SCHEMAS.length - 1)
    setOpen(true)
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % SUGGESTED_SCHEMAS.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i <= 0 ? SUGGESTED_SCHEMAS.length - 1 : i - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(SUGGESTED_SCHEMAS.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      // Tabbing away is a dismissal, but let focus land where it was headed.
      close(false)
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setActiveIndex(0)
          setOpen((wasOpen) => !wasOpen)
        }}
        onKeyDown={onButtonKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0.35rem 0.6rem',
          fontSize: '0.8125rem',
          fontWeight: 500,
          fontFamily: 'inherit',
          border: `1px solid ${palette.chromeBorder}`,
          borderRadius: '6px',
          background: open ? palette.chromeBorder : 'transparent',
          color: open ? palette.textPrimary : palette.textMuted,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Examples
        <CaretIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Example API documents"
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 30,
            minWidth: '260px',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {SUGGESTED_SCHEMAS.map((schema, i) => (
            <button
              key={schema.url}
              ref={(node) => {
                itemRefs.current[i] = node
              }}
              type="button"
              role="menuitem"
              // Roving tabindex: only the active item is reachable by Tab, so
              // the menu is one stop rather than one per example.
              tabIndex={i === activeIndex ? 0 : -1}
              onClick={() => choose(schema)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.4rem 0.6rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                color: i === activeIndex ? palette.textPrimary : palette.textMuted,
                background: i === activeIndex ? palette.chromeBorder : 'transparent',
                outline: 'none',
              }}
            >
              <div>{schema.label}</div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Bundled examples have a `local://` URL that means nothing to
                    a reader — show what it actually is instead. */}
                {schema.content === undefined ? schema.url : 'Bundled example'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
