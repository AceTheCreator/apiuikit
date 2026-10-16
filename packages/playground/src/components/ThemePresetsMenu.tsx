import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ConfigInterface } from 'apiuikit'
import { THEME_PRESETS, isPresetActive } from '../themes/presets'
import type { ThemePreset } from '../themes/presets'
import type { UiPalette } from '../theme'

interface ThemePresetsMenuProps {
  palette: UiPalette
  theme: ConfigInterface['theme']
  onSelect: (preset: ThemePreset) => void
  /** Set while the config JSON is invalid — applying would discard the user's in-progress text. */
  disabled?: boolean
}

const COLUMNS = 2

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
 * Applies one of the curated theme presets to the config in one click.
 *
 * Unlike ExamplesMenu, picking an item leaves the menu open: the point is to
 * click through presets and watch the preview recolor, so closing after each
 * pick would turn browsing into two clicks per theme.
 */
export function ThemePresetsMenu({ palette, theme, onSelect, disabled = false }: ThemePresetsMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

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

  // The config became invalid while the menu was open — close it rather than
  // leave clickable items that would do nothing.
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  // Opening lands on the currently applied preset, if any.
  const initialIndex = () => Math.max(0, THEME_PRESETS.findIndex((preset) => isPresetActive(theme, preset)))

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setActiveIndex(initialIndex())
    setOpen(true)
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = THEME_PRESETS.length - 1
    const move = (delta: number) => setActiveIndex((i) => Math.min(last, Math.max(0, i + delta)))
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(COLUMNS)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-COLUMNS)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(last)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
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
        disabled={disabled}
        title={disabled ? 'Fix the config JSON to apply a preset' : undefined}
        onClick={() => {
          setActiveIndex(initialIndex())
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
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        Theme presets
        <CaretIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme presets"
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 30,
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
            gap: '2px',
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {THEME_PRESETS.map((preset, i) => {
            const applied = isPresetActive(theme, preset)
            const highlighted = i === activeIndex
            const swatches = [
              preset.dark.background,
              preset.dark.surface,
              preset.dark.border,
              preset.accent ?? preset.dark.textPrimary,
            ]
            return (
              <button
                key={preset.id}
                ref={(node) => {
                  itemRefs.current[i] = node
                }}
                type="button"
                role="menuitemradio"
                aria-checked={applied}
                tabIndex={highlighted ? 0 : -1}
                onClick={() => onSelect(preset)}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.4rem 0.5rem',
                  border: 'none',
                  borderRadius: '6px',
                  boxShadow: applied ? `inset 0 0 0 1px ${palette.textMuted}` : 'none',
                  fontSize: '0.8125rem',
                  fontWeight: applied ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: highlighted || applied ? palette.textPrimary : palette.textMuted,
                  background: highlighted ? palette.chromeBorder : 'transparent',
                  outline: 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    flexShrink: 0,
                    width: '52px',
                    height: '18px',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    border: `1px solid ${palette.chromeBorder}`,
                  }}
                >
                  {swatches.map((color, j) => (
                    <span key={j} style={{ flex: 1, background: color }} />
                  ))}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preset.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
