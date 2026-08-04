export type UiMode = 'light' | 'dark'

export interface UiPalette {
  chromeBg: string
  chromeBorder: string
  textPrimary: string
  textMuted: string
  hoverText: string
  activeIndicator: string
  focusRing: string
  errorBg: string
  errorBorder: string
  errorText: string
  warningText: string
  handleBg: string
  handleBgHover: string
  scrollbarTrack: string
  scrollbarThumb: string
  scrollbarThumbHover: string
}

export const UI_PALETTES: Record<UiMode, UiPalette> = {
  // GitHub Dark (Primer) palette — kept in sync with the AsyncAPI preview's
  // `defaultConfig.theme.dark` in packages/lib/src/config/default.ts so the
  // playground chrome and the rendered spec read as one consistent theme.
  dark: {
    chromeBg: '#0d1117',
    chromeBorder: '#30363d',
    textPrimary: '#c9d1d9',
    textMuted: '#8b949e',
    hoverText: '#e6edf3',
    activeIndicator: '#58a6ff',
    focusRing: '#1f6feb',
    errorBg: '#490202',
    errorBorder: '#da3633',
    errorText: '#f85149',
    warningText: '#d29922',
    handleBg: '#30363d',
    handleBgHover: '#6e7681',
    scrollbarTrack: '#0d1117',
    scrollbarThumb: '#30363d',
    scrollbarThumbHover: '#6e7681',
  },
  // Tailwind Slate — kept in sync with `defaultConfig.theme.light` in
  // packages/lib/src/config/default.ts, the same way `dark` above tracks
  // `theme.dark`, so the chrome and the rendered spec read as one theme
  // rather than the chrome sitting a shade brighter than the preview.
  light: {
    chromeBg: '#f8fafc',
    chromeBorder: '#e2e8f0',
    textPrimary: '#1e293b',
    textMuted: '#64748b',
    hoverText: '#1e293b',
    activeIndicator: '#e2e8f0',
    focusRing: '#3b82f6',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    errorText: '#dc2626',
    warningText: '#b45309',
    handleBg: '#e2e8f0',
    handleBgHover: '#cbd5e1',
    scrollbarTrack: '#f8fafc',
    scrollbarThumb: '#cbd5e1',
    scrollbarThumbHover: '#94a3b8',
  },
}

/** CSS text for a themed scrollbar (standard `scrollbar-*` props + WebKit pseudo-elements) on the given selector. */
export function scrollbarStyle(selector: string, palette: UiPalette): string {
  return `
    ${selector} {
      scrollbar-color: ${palette.scrollbarThumb} ${palette.scrollbarTrack};
      scrollbar-width: thin;
    }
    ${selector}::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ${selector}::-webkit-scrollbar-track {
      background: ${palette.scrollbarTrack};
    }
    ${selector}::-webkit-scrollbar-thumb {
      background: ${palette.scrollbarThumb};
      border-radius: 6px;
      border: 2px solid ${palette.scrollbarTrack};
    }
    ${selector}::-webkit-scrollbar-thumb:hover {
      background: ${palette.scrollbarThumbHover};
    }
  `
}
