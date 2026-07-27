import { AsyncAPIRenderer, defaultConfig } from 'apiuikit'
import type { ConfigInterface } from 'apiuikit'
import 'apiuikit/style.css'
import { useMemo, useState } from 'react'
import exampleDoc from './examples/example1.json'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import type { ParserDiagnostic } from './components/DiagnosticsPanel'
import { EditorPane } from './components/EditorPane'
import { EditorTabs } from './components/EditorTabs'
import type { EditorTab } from './components/EditorTabs'
import { FetchSchema } from './components/FetchSchema'
import { GitHubLink } from './components/GitHubLink'
import { ResizeHandle } from './components/ResizeHandle'
import { ThemeToggle } from './components/ThemeToggle'
import { ViewToggle } from './components/ViewToggle'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useJsonEditor } from './hooks/useJsonEditor'
import { useResizableSplit } from './hooks/useResizableSplit'
import { scrollbarStyle, UI_PALETTES } from './theme'
import type { UiMode } from './theme'

const DEFAULT_DOC_TEXT = JSON.stringify(exampleDoc, null, 2)

export interface PlaygroundProps {
  /** Initial AsyncAPI document text (JSON or YAML). Uncontrolled — only read on mount. */
  initialDocument?: string
  /** Initial renderer config. Uncontrolled — only read on mount. */
  initialConfig?: ConfigInterface
  /** Initial UI color mode. The user can still toggle it afterwards. */
  defaultUiMode?: UiMode
  /** CSS height of the playground root. Defaults to filling the host container. */
  height?: string
}

export function Playground({
  initialDocument,
  initialConfig,
  defaultUiMode = 'light',
  height = '100%',
}: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('doc')
  const [uiMode, setUiMode] = useState<UiMode>(defaultUiMode)
  const [editorExpanded, setEditorExpanded] = useState(false)
  const palette = UI_PALETTES[uiMode]

  // AsyncAPIRenderer parses `raw` itself via the real @asyncapi/parser and reports
  // real spec diagnostics — no need for our own JSON.parse validation on this side.
  const [docText, setDocText] = useState(initialDocument ?? DEFAULT_DOC_TEXT)
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

  // Uncontrolled prop: capture the mount-time value so a re-rendering parent
  // passing a fresh object literal doesn't reset the editor.
  const [configSeed] = useState(() => initialConfig ?? defaultConfig)
  const config = useJsonEditor<ConfigInterface>(JSON.stringify(configSeed, null, 2), configSeed, {
    emptyValue: configSeed,
  })

  // The toggle is authoritative over the AsyncAPI preview's light/dark mode: it only
  // forwards the branch matching the current mode, ignoring whichever theme.light/theme.dark
  // the user's own edited config also defines for the other mode. Brand `colors` scales
  // and `depthColors` aren't mode-specific, so they always pass through untouched.
  const previewConfig = useMemo<ConfigInterface>(
    () => ({
      ...config.value,
      theme: {
        colors: config.value.theme?.colors,
        depthColors: config.value.theme?.depthColors,
        ...(uiMode === 'dark' ? { dark: config.value.theme?.dark } : { light: config.value.theme?.light }),
      },
    }),
    [config.value, uiMode],
  )

  const { containerRef, splitPercent, handlePointerDown, nudge } = useResizableSplit()

  return (
    <div ref={containerRef} style={{ display: 'flex', height, position: 'relative', background: palette.chromeBg }}>
      <div
        className="playground-preview-scroll"
        style={{ width: editorExpanded ? `${splitPercent}%` : '100%', overflow: 'auto' }}
      >
        <style>{scrollbarStyle('.playground-preview-scroll', palette)}</style>
        <AsyncAPIRenderer
          raw={debouncedDocText}
          config={previewConfig}
          onDiagnostics={(d) => setDiagnostics(d as ParserDiagnostic[])}
        />
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
                  <GitHubLink palette={palette} />
                  <ThemeToggle mode={uiMode} palette={palette} onChange={setUiMode} />
                  <ViewToggle expanded palette={palette} onChange={setEditorExpanded} />
                </div>
              }
              tabs={[
                { id: 'doc', label: 'AsyncAPI Document', hasError: hasDocErrors },
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
                    ariaLabel="AsyncAPI document"
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
          <GitHubLink palette={palette} />
          <ThemeToggle mode={uiMode} palette={palette} onChange={setUiMode} />
          <ViewToggle expanded={false} palette={palette} onChange={setEditorExpanded} />
        </div>
      )}
    </div>
  )
}
