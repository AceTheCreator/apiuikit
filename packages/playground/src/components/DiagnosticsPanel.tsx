import type { UiPalette } from '../theme'

export interface ParserDiagnostic {
  message: string
  path?: (string | number)[]
  severity: number
}

interface DiagnosticsPanelProps {
  diagnostics: ParserDiagnostic[]
  palette: UiPalette
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

export function DiagnosticsPanel({ diagnostics, palette }: DiagnosticsPanelProps) {
  if (diagnostics.length === 0) return null

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
      {diagnostics.map((d, i) => (
        <div
          key={i}
          style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            borderTop: i > 0 ? `1px solid ${palette.chromeBorder}` : 'none',
            color: severityColor(d.severity, palette),
          }}
        >
          <strong>{severityLabel(d.severity)}</strong>
          {d.path && d.path.length > 0 ? ` (${formatPath(d.path)})` : ''}: {d.message}
        </div>
      ))}
    </div>
  )
}
