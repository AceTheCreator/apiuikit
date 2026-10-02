import { AsyncAPIRenderer, OpenAPIRenderer, defaultConfig } from 'apiuikit'
import type { ConfigInterface } from 'apiuikit'
import type { ApiuikitPlugin } from 'apiuikit/plugin'
import 'apiuikit/style.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import type { ParserDiagnostic } from './components/DiagnosticsPanel'
import { EditorPane } from './components/EditorPane'
import { EditorTabs } from './components/EditorTabs'
import type { EditorTab } from './components/EditorTabs'
import { FetchSchema } from './components/FetchSchema'
import { GitHubLink } from './components/GitHubLink'
import { ResizeHandle } from './components/ResizeHandle'
import { ShareButton } from './components/ShareButton'
import { ThemeToggle } from './components/ThemeToggle'
import { ViewToggle } from './components/ViewToggle'
import { DEFAULT_SUGGESTED_SCHEMA, SUGGESTED_SCHEMAS } from './data/suggestedSchemas'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useJsonEditor } from './hooks/useJsonEditor'
import { useResizableSplit } from './hooks/useResizableSplit'
import { scrollbarStyle, UI_PALETTES } from './theme'
import type { UiMode } from './theme'
import { netlifyTheme } from './themes/netlify'
import {
  clearShareId,
  createShare,
  fetchShare,
  readShareId,
  readStoredSnapshot,
  writeStoredSnapshot,
} from './utils/playgroundState'

const DEFAULT_DOC_TEXT = DEFAULT_SUGGESTED_SCHEMA.content
const UI_MODE_STORAGE_KEY = 'apiuikit-playground-ui-mode'
const PLAYGROUND_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
const MARKDOWN_CANDIDATES_BY_LENGTH = new Map<number, Array<{ content: string; path: string }>>()
for (const { content, markdownPath } of SUGGESTED_SCHEMAS) {
  if (content === undefined || markdownPath === undefined) continue
  const candidates = MARKDOWN_CANDIDATES_BY_LENGTH.get(content.length) ?? []
  candidates.push({ content, path: markdownPath })
  MARKDOWN_CANDIDATES_BY_LENGTH.set(content.length, candidates)
}

function readStoredUiMode(): UiMode | null {
  try {
    const stored = localStorage.getItem(UI_MODE_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

/**
 * The playground boots on the Netlify theme rather than the library's own
 * defaults. Spread over `defaultConfig.theme` rather than replacing it so
 * non-color theme settings (currently `depthColors`) still come from the
 * library. Only the playground is affected — `defaultConfig` itself is
 * untouched, so consumers of the package get the shipped default look.
 */
const DEFAULT_CONFIG: ConfigInterface = {
  ...defaultConfig,
  theme: { ...defaultConfig.theme, ...netlifyTheme },
  // The preview is an embedded, independently scrolling pane. Keep overlays
  // inside the rendered docs instead of covering the browser/editor chrome.
  sidePanel: { ...defaultConfig.sidePanel, containment: 'component' },
  // On here, off everywhere else: `show.tryIt` defaults to false, and the
  // playground is exactly where you'd want to see what it does. It also puts
  // the flag in the editable config pane, so visitors can toggle it and watch
  // the panel header change.
  show: { ...defaultConfig.show, tryIt: true },
}

export interface PlaygroundProps {
  /** Initial AsyncAPI document text (JSON or YAML). Uncontrolled — only read on mount. */
  initialDocument?: string
  /** Initial renderer config. Uncontrolled — only read on mount. */
  initialConfig?: ConfigInterface
  /** Initial UI color mode. The user can still toggle it afterwards. */
  defaultUiMode?: UiMode
  /** CSS height of the playground root. Defaults to filling the host container. */
  height?: string
  /**
   * Renderer plugins (e.g. the try-it panel) to register on the preview.
   * Pass a stable array — a fresh literal on every render re-registers the
   * plugins and resets the operation's selected tab.
   */
  plugins?: ApiuikitPlugin[]
  /**
   * Save the document and config text to localStorage and restore them on
   * mount (taking precedence over `initialDocument` / `initialConfig`).
   */
  persist?: boolean
  /**
   * Share-link API base (e.g. `/api/share`). When set, a Share button uploads
   * the current document + config and copies a `?s=<id>` link, and a `?s=`
   * param in the page URL is loaded on mount.
   */
  shareEndpoint?: string
}

type ShareLoad = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

export function Playground({
  initialDocument,
  initialConfig,
  defaultUiMode = 'light',
  height = '100%',
  plugins,
  persist = false,
  shareEndpoint,
}: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('doc')
  const [uiMode, setUiMode] = useState<UiMode>(() => readStoredUiMode() ?? defaultUiMode)
  const [editorExpanded, setEditorExpanded] = useState(true)
  const palette = UI_PALETTES[uiMode]

  useEffect(() => {
    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, uiMode)
    } catch {
      // Ignore quota / private-mode failures — theme still works in-session.
    }
  }, [uiMode])

  // AsyncAPIRenderer parses `raw` itself via the real @asyncapi/parser and reports
  // real spec diagnostics — no need for our own JSON.parse validation on this side.
  // Uncontrolled props: capture the mount-time values so a re-rendering parent
  // passing fresh literals doesn't reset the editors. A persisted session wins
  // over the props.
  const [seed] = useState(() => {
    const stored = persist ? readStoredSnapshot() : null
    const configSeed = initialConfig ?? DEFAULT_CONFIG
    return {
      doc: stored?.doc ?? initialDocument ?? DEFAULT_DOC_TEXT,
      configText: stored?.config ?? JSON.stringify(configSeed, null, 2),
      configSeed,
    }
  })
  const [docText, setDocText] = useState(seed.doc)
  // Parsing hits the real spec-validating parser (~500ms) — debounce so typing doesn't
  // fire a fresh parse on every keystroke.
  const debouncedDocText = useDebouncedValue(docText, 400)
  const [diagnostics, setDiagnostics] = useState<ParserDiagnostic[]>([])
  const hasDocErrors = diagnostics.some((d) => d.severity === 0)

  // The doc editor accepts both JSON and YAML (e.g. fetched .yml examples), so pick
  // the highlighter from the content itself.
  const docLanguage = useMemo(() => {
    const head = docText.trimStart()
    return head.startsWith('{') ? 'json' : 'yaml'
  }, [docText])

  // Sniffs the document's own top-level key to pick which renderer/parser to
  // hand it to, rather than asking the user to choose. Defaults to AsyncAPI
  // when neither key is found (e.g. mid-edit/empty doc).
  const specType = useMemo<'asyncapi' | 'openapi'>(() => {
    // JSON docs are parsed directly rather than line-sniffed: minified/pasted
    // JSON puts the top-level key right after `{` on the same line, which a
    // line-anchored regex would never match.
    if (docText.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(docText)
        if (parsed && typeof parsed === 'object') {
          if ('asyncapi' in parsed) return 'asyncapi'
          if ('openapi' in parsed || 'swagger' in parsed) return 'openapi'
        }
      } catch {
        // Invalid/mid-edit JSON — fall through to the line sniff below.
      }
    }
    // YAML has no such ambiguity: a top-level key always starts its own line.
    const match = docText.match(/^\s*["']?(asyncapi|openapi|swagger)["']?\s*:/m)
    if (!match) return 'asyncapi'
    return match[1] === 'asyncapi' ? 'asyncapi' : 'openapi'
  }, [docText])

  const config = useJsonEditor<ConfigInterface>(seed.configText, seed.configSeed, {
    emptyValue: seed.configSeed,
  })
  const { onChange: setConfigText } = config

  // A `?s=<id>` share link replaces whatever was seeded above once it loads.
  const [shareLoad, setShareLoad] = useState<ShareLoad>(() =>
    shareEndpoint && readShareId() ? { status: 'loading' } : { status: 'idle' },
  )
  const shareFetchStarted = useRef(false) // StrictMode runs mount effects twice
  useEffect(() => {
    if (!shareEndpoint || shareFetchStarted.current) return
    const id = readShareId()
    if (!id) return
    shareFetchStarted.current = true
    fetchShare(shareEndpoint, id)
      .then((snapshot) => {
        setDocText(snapshot.doc)
        setConfigText(snapshot.config)
        // From here on the session is the user's own — a reload should restore
        // their edits from localStorage, not re-fetch the original share.
        clearShareId()
        setShareLoad({ status: 'idle' })
      })
      .catch((err: Error) => setShareLoad({ status: 'error', message: err.message }))
  }, [shareEndpoint, setConfigText])

  // Debounced so typing in a large spec doesn't re-serialize it on every keystroke.
  const persistedDoc = useDebouncedValue(docText, 500)
  const persistedConfig = useDebouncedValue(config.text, 500)
  useEffect(() => {
    // Hold off while a share link loads so the pre-share state isn't written over it.
    if (!persist || shareLoad.status === 'loading') return
    writeStoredSnapshot({ v: 1, doc: persistedDoc, config: persistedConfig })
  }, [persist, shareLoad.status, persistedDoc, persistedConfig])

  // Reopening the share dialog without editing reuses the last link instead of
  // re-uploading (ids are content hashes, so it would be the same link anyway).
  const lastShare = useRef<{ doc: string; config: string; url: string } | null>(null)
  const handleShare = async () => {
    const doc = docText
    const configText = config.text
    const last = lastShare.current
    if (last && last.doc === doc && last.config === configText) return last.url
    const url = await createShare(shareEndpoint!, { v: 1, doc, config: configText })
    lastShare.current = { doc, config: configText, url }
    return url
  }

  // theme.mode typed directly into the config editor is authoritative for the
  // preview — the toggle only supplies a mode when the config doesn't set one
  // itself, so editing `mode` in the JSON has a visible effect instead of
  // being silently overwritten by whatever the toggle last set.
  const configuredMode = config.value.theme?.mode
  const previewConfig = useMemo<ConfigInterface>(
    () => ({
      ...config.value,
      theme: { ...config.value.theme, mode: configuredMode ?? uiMode },
    }),
    [config.value, configuredMode, uiMode],
  )

  // Keep the toggle (and the playground's own chrome, which is themed by
  // uiMode) in sync when the user edits theme.mode directly in the config
  // editor, so the button always reflects what's actually being rendered.
  useEffect(() => {
    if (configuredMode === 'light' || configuredMode === 'dark') {
      setUiMode(configuredMode)
    }
  }, [configuredMode])

  // The toggle writes back into the config editor's own text, not just local
  // state, so clicking it and editing theme.mode by hand are two views onto
  // the same value rather than the toggle silently winning.
  const handleUiModeChange = (nextMode: UiMode) => {
    setUiMode(nextMode)
    config.onChange(
      JSON.stringify(
        { ...config.value, theme: { ...config.value.theme, mode: nextMode } },
        null,
        2,
      ),
    )
  }

  const { containerRef, splitPercent, handlePointerDown, nudge } = useResizableSplit()

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height,
        position: 'relative',
        background: palette.chromeBg,
        fontFamily: PLAYGROUND_FONT_FAMILY,
      }}
    >
      <div
        className="playground-preview-scroll"
        style={{ width: editorExpanded ? `${splitPercent}%` : '100%', overflow: 'auto' }}
      >
        <style>{scrollbarStyle('.playground-preview-scroll', palette)}</style>
        {specType === 'openapi' ? (
          <OpenAPIRenderer
            raw={debouncedDocText}
            config={previewConfig}
            plugins={plugins}
            onDiagnostics={(d) => setDiagnostics(d as ParserDiagnostic[])}
          />
        ) : (
          <AsyncAPIRenderer
            raw={debouncedDocText}
            config={previewConfig}
            onDiagnostics={(d) => setDiagnostics(d as ParserDiagnostic[])}
          />
        )}
      </div>

      {editorExpanded && (
        <>
          <ResizeHandle splitPercent={splitPercent} onPointerDown={handlePointerDown} onNudge={nudge} palette={palette} />

          <div style={{ display: 'flex', flexDirection: 'column', width: `${100 - splitPercent}%` }}>
            <EditorTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              palette={palette}
              trailing={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '6px' }}>
                  {shareEndpoint && <ShareButton palette={palette} onShare={handleShare} />}
                  <GitHubLink palette={palette} />
                  <ThemeToggle mode={uiMode} palette={palette} onChange={handleUiModeChange} />
                  <ViewToggle expanded palette={palette} onChange={setEditorExpanded} />
                </div>
              }
              tabs={[
                {
                  id: 'doc',
                  label: specType === 'openapi' ? 'OpenAPI Document' : 'AsyncAPI Document',
                  hasError: hasDocErrors,
                },
                { id: 'config', label: 'Config', hasError: config.error != null },
              ]}
            />
            <div
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              {activeTab === 'doc' ? (
                <>
                  <FetchSchema palette={palette} onLoad={setDocText} />
                  <EditorPane
                    ariaLabel={specType === 'openapi' ? 'OpenAPI document' : 'AsyncAPI document'}
                    value={docText}
                    onChange={setDocText}
                    error={null}
                    mode={uiMode}
                    palette={palette}
                    language={docLanguage}
                  />
                  <DiagnosticsPanel diagnostics={diagnostics} palette={palette} />
                </>
              ) : (
                <EditorPane
                  ariaLabel="Config JSON"
                  value={config.text}
                  onChange={config.onChange}
                  error={config.error}
                  mode={uiMode}
                  palette={palette}
                />
              )}
            </div>
          </div>
        </>
      )}

      {shareLoad.status !== 'idle' && (
        <div
          role={shareLoad.status === 'error' ? 'alert' : 'status'}
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 10px',
            fontSize: '13px',
            background: shareLoad.status === 'error' ? palette.errorBg : palette.chromeBg,
            color: shareLoad.status === 'error' ? palette.errorText : palette.textPrimary,
            border: `1px solid ${shareLoad.status === 'error' ? palette.errorBorder : palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
          }}
        >
          {shareLoad.status === 'loading' ? 'Loading shared spec…' : shareLoad.message}
          {shareLoad.status === 'error' && (
            <button
              type="button"
              onClick={() => setShareLoad({ status: 'idle' })}
              aria-label="Dismiss"
              style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {!editorExpanded && (
        <div
          style={{
            // Absolute (not fixed) so the toolbar pins to the playground container,
            // which may be embedded partway down a host page.
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 40,
          }}
        >
          {shareEndpoint && <ShareButton palette={palette} onShare={handleShare} />}
          <GitHubLink palette={palette} />
          <ThemeToggle mode={uiMode} palette={palette} onChange={handleUiModeChange} />
          <ViewToggle expanded={false} palette={palette} onChange={setEditorExpanded} />
        </div>
      )}
    </div>
  )
}
