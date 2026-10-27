import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { UiPalette } from '../theme'

/** `config`, or `file:<name>` for a workspace file. */
export type EditorTab = 'config' | `file:${string}`

export const fileTab = (name: string): EditorTab => `file:${name}`

/** The file a tab shows, or null for the Config tab. */
export const tabFile = (tab: EditorTab): string | null => (tab.startsWith('file:') ? tab.slice(5) : null)

export interface TabDescriptor {
  id: EditorTab
  /** DOM id of the tab element — file names aren't safe to use in one. */
  domId: string
  label: string
  hasError: boolean
  /** Marks the rendered file. */
  isEntry?: boolean
  /** Lets double-click and F2 start a rename. */
  onRename?: () => void
  /** Shows a × button on the tab, and lets the Delete key delete the file. */
  onDelete?: () => void
}

interface EditorTabsProps {
  /** Workspace files, shown in a strip that scrolls when they don't fit. */
  fileTabs: TabDescriptor[]
  /** Pinned after the files, outside the scrolling strip (the Config tab). */
  pinnedTabs: TabDescriptor[]
  activeTab: EditorTab
  onChange: (tab: EditorTab) => void
  palette: UiPalette
  /** Controls right after the tabs (new file, file menu). */
  actions?: ReactNode
  trailing?: ReactNode
}

const FILE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M9 13h6M9 17h6" />
  </svg>
)

// A file with a play triangle: "this is the one that runs".
const ENTRY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M10 11.5v5l4-2.5Z" fill="currentColor" />
  </svg>
)

const CONFIG_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

export function EditorTabs({ fileTabs, pinnedTabs, activeTab, onChange, palette, actions, trailing }: EditorTabsProps) {
  const buttonRefs = useRef<Map<EditorTab, HTMLButtonElement>>(new Map())
  const stripRef = useRef<HTMLDivElement>(null)
  // Which edges of the file strip have tabs scrolled out of view — those edges
  // fade out, the only hint that there's more (the scrollbar is hidden).
  const [hidden, setHidden] = useState({ start: false, end: false })
  const tabs = [...fileTabs, ...pinnedTabs]

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const update = () => {
      const start = strip.scrollLeft > 1
      const end = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1
      setHidden((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    strip.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(strip)
    return () => {
      strip.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [fileTabs.length])

  // Deleting from a tab removes the focused element; focus moves to the tab
  // that's active afterwards instead of dropping to the page.
  const refocusAfterDelete = useRef(false)

  // Keep the active file visible in the strip — e.g. after adding a file, or
  // opening one from the diagnostics panel.
  useLayoutEffect(() => {
    const button = buttonRefs.current.get(activeTab)
    button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    if (refocusAfterDelete.current) {
      refocusAfterDelete.current = false
      button?.focus()
    }
  }, [activeTab, fileTabs.length])

  const deleteTab = (tab: TabDescriptor) => {
    refocusAfterDelete.current = true
    tab.onDelete!()
  }

  const focusTab = (id: EditorTab) => {
    onChange(id)
    buttonRefs.current.get(id)?.focus()
  }

  // Roving-tabindex arrow key navigation per the WAI-ARIA tabs pattern.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        e.preventDefault()
        const delta = e.key === 'ArrowRight' ? 1 : -1
        const next = tabs[(index + delta + tabs.length) % tabs.length]
        focusTab(next.id)
        break
      }
      case 'Home':
        e.preventDefault()
        focusTab(tabs[0].id)
        break
      case 'End':
        e.preventDefault()
        focusTab(tabs[tabs.length - 1].id)
        break
      case 'F2':
        if (tabs[index].onRename) {
          e.preventDefault()
          tabs[index].onRename!()
        }
        break
      case 'Delete':
        if (tabs[index].onDelete) {
          e.preventDefault()
          deleteTab(tabs[index])
        }
        break
    }
  }

  const renderTab = (tab: TabDescriptor, index: number) => {
    const { id, domId, label, hasError, isEntry, onRename, onDelete } = tab
    const isActive = activeTab === id
    const isFile = tabFile(id) !== null
    const button = (
      <button
        key={id}
        ref={(el) => {
          if (el) buttonRefs.current.set(id, el)
          else buttonRefs.current.delete(id)
        }}
        type="button"
        role="tab"
        id={domId}
        aria-controls="playground-editor-panel"
        aria-selected={isActive}
        aria-description={
          [isEntry && 'Entry file, rendered in the preview', onDelete && 'Press Delete to delete the file'].filter(Boolean).join('. ') ||
          undefined
        }
        title={isEntry ? `${label} — entry file (rendered)` : label}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onChange(id)}
        onDoubleClick={onRename}
        onKeyDown={(e) => handleKeyDown(e, index)}
        className="playground-editor-tab"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          gap: '0.4rem',
          // The × button sits in the right padding's place.
          padding: onDelete ? '0.4rem 0.2rem 0.4rem 0.75rem' : '0.4rem 0.75rem',
          fontSize: '0.8125rem',
          fontWeight: 500,
          fontFamily: 'inherit',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          border: 'none',
          borderRadius: '6px',
          // With a × button, the wrapper below carries the active background.
          background: isActive && !onDelete ? palette.activeIndicator : 'transparent',
          color: isActive ? palette.textPrimary : palette.textMuted,
          cursor: 'pointer',
          transition: 'color 150ms ease, background 150ms ease',
        }}
      >
        {isFile ? (isEntry ? ENTRY_ICON : FILE_ICON) : CONFIG_ICON}
        {label}
        {hasError && (
          <span
            aria-label="has errors"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#f87171',
              boxShadow: `0 0 0 3px rgba(248, 113, 113, 0.2), 0 0 0 2px ${palette.chromeBg}`,
            }}
          />
        )}
      </button>
    )
    if (!onDelete) return button

    // A button can't sit inside the tab button, so the × is its sibling. It's
    // out of the tab order: keyboard users press Delete on the tab instead.
    return (
      <span
        key={id}
        className="playground-editor-tab-wrap"
        data-active={isActive || undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          paddingRight: '4px',
          borderRadius: '6px',
          background: isActive ? palette.activeIndicator : 'transparent',
          transition: 'background 150ms ease',
        }}
      >
        {button}
        <button
          type="button"
          tabIndex={-1}
          className="playground-editor-tab-close"
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          onClick={() => deleteTab(tab)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            padding: 0,
            border: 'none',
            borderRadius: '4px',
            background: 'transparent',
            color: palette.errorText,
            cursor: 'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // In a narrow pane the toolbar drops to its own row instead of
        // squeezing the file strip down to nothing.
        flexWrap: 'wrap',
        columnGap: '4px',
        borderBottom: `1px solid ${palette.chromeBorder}`,
        background: palette.chromeBg,
        flexShrink: 0,
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
    >
      <style>{`
        .playground-editor-tab:hover {
          color: ${palette.hoverText};
        }
        .playground-editor-tab[aria-selected="true"] {
          color: ${palette.textPrimary};
        }
        .playground-editor-tab:focus-visible {
          outline: 2px solid ${palette.focusRing};
          outline-offset: -2px;
        }
        /* The × shows on the active tab and on hover, so idle tabs stay quiet. */
        .playground-editor-tab-close {
          opacity: 0;
          transition: opacity 150ms ease, color 150ms ease, background 150ms ease;
        }
        .playground-editor-tab-wrap:hover .playground-editor-tab-close,
        .playground-editor-tab-wrap[data-active] .playground-editor-tab-close {
          opacity: 1;
        }
        .playground-editor-tab-close:hover {
          background: ${palette.errorBg};
        }
        .playground-file-strip {
          scrollbar-width: none;
        }
        .playground-file-strip::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Room for Config, the file actions and ~120px of file strip. */}
      <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 0%', minWidth: 'min(100%, 280px)' }}>
        <div
          role="tablist"
          aria-label="Editor source"
          style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: 0, padding: '6px' }}
        >
          {/* Scrolls horizontally (scrollbar hidden, wheel/trackpad/keyboard
              still work) so any number of files fits a narrow editor pane. The
              file menu lists them all too. */}
          <div
            ref={stripRef}
            className="playground-file-strip"
            style={{
              display: 'flex',
              gap: '2px',
              minWidth: 0,
              overflowX: 'auto',
              maskImage:
                hidden.start || hidden.end
                  ? `linear-gradient(to right, ${hidden.start ? 'transparent' : '#000'}, #000 24px, #000 calc(100% - 24px), ${hidden.end ? 'transparent' : '#000'})`
                  : undefined,
            }}
          >
            {fileTabs.map((tab, i) => renderTab(tab, i))}
          </div>
          {pinnedTabs.map((tab, i) => renderTab(tab, fileTabs.length + i))}
        </div>
        {actions}
      </div>

      {trailing && <div style={{ marginLeft: 'auto', padding: '2px 0' }}>{trailing}</div>}
    </div>
  )
}
