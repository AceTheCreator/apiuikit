import type { UiPalette } from '../theme'

export interface ParserDiagnostic {
  message: string
  path?: (string | number)[]
  severity: number
  /** Workspace file the diagnostic is about. */
  file?: string
}

interface DiagnosticsPanelProps {
  diagnostics: ParserDiagnostic[]
  palette: UiPalette
  /**
   * Group by file under a header naming it. Off for a one-file workspace,
   * where the header would only repeat the one tab.
   */
  groupByFile?: boolean
  /** Opens a file's editor tab — called from the group headers. */
  onSelectFile?: (file: string) => void
}

// The AsyncAPI parser (built on Spectral) uses 0=Error, 1=Warning, 2=Information, 3=Hint.
function severityLabel(severity: number): string {
  switch (severity) {
    case 0:
      return 'Error'
    case 1:
      return 'Warning'
    case 3:
      return 'Hint'
    default:
      return 'Info'
  }
}

function severityColor(severity: number, palette: UiPalette): string {
  if (severity === 0) return palette.errorText
  if (severity === 1) return palette.warningText
  return palette.textMuted
}

// ["paths", "/pets/{id}", "get", "parameters", "0"] -> "paths › /pets/{id} › get › parameters[0]"
function formatPath(path: (string | number)[]): string {
  return path.reduce<string>((out, segment) => {
    if (/^\d+$/.test(String(segment)) && out) return `${out}[${segment}]`
    return out ? `${out} › ${segment}` : String(segment)
  }, '')
}

function groupByFileName(diagnostics: ParserDiagnostic[]): Array<[string | undefined, ParserDiagnostic[]]> {
  const groups = new Map<string | undefined, ParserDiagnostic[]>()
  for (const d of diagnostics) {
    const group = groups.get(d.file) ?? []
    group.push(d)
    groups.set(d.file, group)
  }
  return [...groups]
}

export function DiagnosticsPanel({ diagnostics, palette, groupByFile = false, onSelectFile }: DiagnosticsPanelProps) {
  if (diagnostics.length === 0) return null

  const groups = groupByFile ? groupByFileName(diagnostics) : [[undefined, diagnostics] as const]

  return (
    <div
      style={{
        maxHeight: '160px',
        overflowY: 'auto',
        borderTop: `1px solid ${palette.chromeBorder}`,
        background: palette.chromeBg,
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
    >
      <style>{`
        .playground-diagnostics-file:hover { color: ${palette.hoverText}; text-decoration: underline; }
        .playground-diagnostics-file:focus-visible { outline: 2px solid ${palette.focusRing}; outline-offset: -2px; }
      `}</style>
      {groups.map(([file, items], groupIndex) => (
        <section key={file ?? ''} aria-label={file ? `Diagnostics for ${file}` : undefined}>
          {groupByFile && file && (
            <button
              type="button"
              className="playground-diagnostics-file"
              onClick={() => onSelectFile?.(file)}
              title={`Open ${file}`}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                border: 'none',
                borderTop: groupIndex > 0 ? `1px solid ${palette.chromeBorder}` : 'none',
                background: 'transparent',
                color: palette.textPrimary,
                cursor: 'pointer',
              }}
            >
              {file} <span style={{ fontWeight: 400, color: palette.textMuted }}>({items.length})</span>
            </button>
          )}
          {items.map((d, i) => (
            <div
              key={i}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                borderTop: i > 0 || groupIndex > 0 || (groupByFile && file) ? `1px solid ${palette.chromeBorder}` : 'none',
                color: severityColor(d.severity, palette),
              }}
            >
              <strong>{severityLabel(d.severity)}</strong>
              {d.path && d.path.length > 0 ? ` (${formatPath(d.path)})` : ''}: {d.message}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
