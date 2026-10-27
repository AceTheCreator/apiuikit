import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, SyntheticEvent } from 'react'
import type { UiPalette } from '../theme'

function iconButtonStyle(palette: UiPalette, active = false) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '26px',
    height: '26px',
    padding: 0,
    border: 'none',
    borderRadius: '6px',
    background: active ? palette.chromeBorder : 'transparent',
    color: active ? palette.textPrimary : palette.textMuted,
    cursor: 'pointer',
  } as const
}

function actionsStyle(palette: UiPalette): string {
  return `
    .playground-file-action:hover { color: ${palette.hoverText}; background: ${palette.chromeBorder}; }
    .playground-file-action:focus-visible { outline: 2px solid ${palette.focusRing}; outline-offset: -2px; }
  `
}

export function NewFileButton({ palette, onClick }: { palette: UiPalette; onClick: () => void }) {
  return (
    <button
      type="button"
      className="playground-file-action"
      onClick={onClick}
      aria-label="New file"
      title="New file"
      style={iconButtonStyle(palette)}
    >
      <style>{actionsStyle(palette)}</style>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

export interface FileMenuEntry {
  name: string
  isEntry: boolean
}

interface FileMenuProps {
  palette: UiPalette
  files: FileMenuEntry[]
  /** The open file, or null while the Config tab is showing. */
  activeFile: string | null
  onOpen: (name: string) => void
  onRename: (name: string) => void
  onSetEntry: (name: string) => void
  onDelete: (name: string) => void
}

interface MenuItem {
  key: string
  label: string
  hint?: string
  role: 'menuitem' | 'menuitemradio'
  checked?: boolean
  disabled?: boolean
  danger?: boolean
  onSelect: () => void
}

/**
 * Lists every file (so the workspace stays navigable when the tab strip is
 * too narrow to show them all) and holds the actions on the open file.
 */
export function FileMenu({ palette, files, activeFile, onOpen, onRename, onSetEntry, onDelete }: FileMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // Which side of the button the menu hangs from: right-aligned when hanging
  // from the left edge would run off the window (the editor is the right pane).
  const [alignRight, setAlignRight] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const current = files.find((f) => f.name === activeFile) ?? null
  const isOnlyFile = files.length === 1

  const items: MenuItem[] = [
    ...files.map<MenuItem>((f) => ({
      key: `file:${f.name}`,
      label: f.name,
      hint: f.isEntry ? 'Entry' : undefined,
      role: 'menuitemradio',
      checked: f.name === activeFile,
      onSelect: () => onOpen(f.name),
    })),
    ...(current
      ? [
          {
            key: 'rename',
            label: 'Rename…',
            role: 'menuitem',
            onSelect: () => onRename(current.name),
          } satisfies MenuItem,
          {
            key: 'entry',
            label: 'Set as entry file',
            hint: current.isEntry ? 'Already the entry' : 'Render this file',
            role: 'menuitem',
            disabled: current.isEntry,
            onSelect: () => onSetEntry(current.name),
          } satisfies MenuItem,
          {
            // No confirm step: deleting shows an Undo notice instead.
            key: 'delete',
            label: 'Delete',
            hint: isOnlyFile ? 'The only file' : current.isEntry ? 'Another file becomes the entry' : undefined,
            role: 'menuitem',
            disabled: isOnlyFile,
            danger: !isOnlyFile,
            onSelect: () => onDelete(current.name),
          } satisfies MenuItem,
        ]
      : []),
  ]
  const separatorBefore = files.length

  useLayoutEffect(() => {
    if (!open) {
      setAlignRight(false)
      return
    }
    const menu = menuRef.current
    if (menu && menu.getBoundingClientRect().right > document.documentElement.clientWidth - 8) setAlignRight(true)
  }, [open])

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

  const choose = (item: MenuItem) => {
    if (item.disabled) return
    close(true)
    item.onSelect()
  }

  const openAt = (index: number) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openAt(event.key === 'ArrowDown' ? 0 : items.length - 1)
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(items.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
      <style>{actionsStyle(palette)}</style>
      <button
        ref={buttonRef}
        type="button"
        className="playground-file-action"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Files"
        title="Files"
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onButtonKeyDown}
        style={iconButtonStyle(palette, open)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Files"
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(alignRight ? { right: 0 } : { left: 0 }),
            zIndex: 30,
            minWidth: '220px',
            maxWidth: '320px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {items.map((item, i) => {
            const isActive = i === activeIndex
            const color = item.disabled
              ? palette.textMuted
              : item.danger
                ? palette.errorText
                : isActive || item.checked
                  ? palette.textPrimary
                  : palette.textMuted
            return (
              <div key={item.key}>
                {i === separatorBefore && (
                  <div role="separator" style={{ height: '1px', margin: '4px 2px', background: palette.chromeBorder }} />
                )}
                <button
                  ref={(node) => {
                    itemRefs.current[i] = node
                  }}
                  type="button"
                  role={item.role}
                  aria-checked={item.role === 'menuitemradio' ? item.checked : undefined}
                  aria-disabled={item.disabled || undefined}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.4rem 0.6rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontFamily: 'inherit',
                    cursor: item.disabled ? 'default' : 'pointer',
                    color,
                    opacity: item.disabled ? 0.6 : 1,
                    background: isActive ? palette.chromeBorder : 'transparent',
                    outline: 'none',
                  }}
                >
                  <span style={{ width: '10px', flexShrink: 0 }} aria-hidden>
                    {item.checked ? '✓' : ''}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: item.checked ? 600 : 400 }}>
                    {item.label}
                  </span>
                  {item.hint && (
                    <span style={{ fontSize: '0.6875rem', color: palette.textMuted, whiteSpace: 'nowrap' }}>{item.hint}</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface FileNameBarProps {
  palette: UiPalette
  label: string
  initialName: string
  /** Returns an error message to show, or null when the name was accepted. */
  onSubmit: (name: string) => string | null
  onCancel: () => void
}

/** An inline name field under the tabs, for renaming (and naming new) files. */
export function FileNameBar({ palette, label, initialName, onSubmit, onCancel }: FileNameBarProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    // Select the stem so typing replaces the name but keeps the extension.
    const dot = initialName.lastIndexOf('.')
    const slash = initialName.lastIndexOf('/')
    input.setSelectionRange(slash + 1, dot > slash + 1 ? dot : initialName.length)
  }, [initialName])

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(onSubmit(name.trim()))
  }

  const buttonStyle = {
    padding: '0.35rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    fontFamily: 'inherit',
    border: `1px solid ${palette.chromeBorder}`,
    borderRadius: '6px',
    background: 'transparent',
    color: palette.textMuted,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as const

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        borderBottom: `1px solid ${palette.chromeBorder}`,
        background: palette.chromeBg,
      }}
    >
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          aria-label={label}
          aria-invalid={error != null}
          spellCheck={false}
          autoComplete="off"
          placeholder="specs/petstore.yaml"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.35rem 0.6rem',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            border: `1px solid ${error ? palette.errorBorder : palette.chromeBorder}`,
            borderRadius: '6px',
            background: 'transparent',
            color: palette.textPrimary,
            outline: 'none',
          }}
        />
        <button type="submit" style={buttonStyle}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={buttonStyle}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.75rem', color: palette.errorText }}>
          {error}
        </p>
      )}
    </form>
  )
}
