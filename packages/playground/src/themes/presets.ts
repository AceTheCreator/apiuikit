import type { ConfigInterface, ThemeColorScale, ThemeModeColors } from 'apiuikit'
import { generateColorScale } from './colorScale'
import { netlifyTheme } from './netlify'

type ThemeConfig = NonNullable<ConfigInterface['theme']>

export interface PresetModeColors {
  background: string
  surface: string
  border: string
  textPrimary: string
  textSecondary: string
  textMuted: string
}

export interface ThemePreset {
  id: string
  name: string
  light: PresetModeColors
  dark: PresetModeColors
  /** Optional brand accent — when set, a full 50-700 scale is generated from it for `primary`. */
  accent?: string
  /** Hand-tuned primary scale. Wins over `accent` when both are set. */
  primary?: ThemeColorScale
}

const MODE_COLOR_KEYS: Array<keyof PresetModeColors> = [
  'background',
  'surface',
  'border',
  'textPrimary',
  'textSecondary',
  'textMuted',
]

/**
 * The playground's boot theme, listed first so it shows as the active preset
 * on a fresh session and stays one click away after trying the others.
 */
const NETLIFY_PRESET: ThemePreset = {
  id: 'netlify',
  name: 'Netlify',
  light: netlifyTheme.light as PresetModeColors,
  dark: netlifyTheme.dark as PresetModeColors,
  accent: netlifyTheme.colors?.primary?.[300],
  primary: netlifyTheme.colors?.primary,
}

/**
 * Curated background/surface/border/text presets. Everything after Netlify
 * mirrors platform/apps/web/lib/themePresets.ts — keep the two in sync.
 */
export const THEME_PRESETS: ThemePreset[] = [
  NETLIFY_PRESET,
  {
    id: 'default',
    name: 'Default',
    light: {
      background: '#ffffff',
      surface: '#ffffff',
      border: '#e2e8f0',
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#64748b',
    },
    dark: {
      background: '#0d1117',
      surface: '#161b22',
      border: '#30363d',
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
    },
    accent: '#58a6ff',
  },
  {
    id: 'alternate',
    name: 'Alternate',
    light: {
      background: '#ffffff',
      surface: '#f5f5f5',
      border: '#e5e5e5',
      textPrimary: '#171717',
      textSecondary: '#404040',
      textMuted: '#737373',
    },
    dark: {
      background: '#000000',
      surface: '#141414',
      border: '#2a2a2a',
      textPrimary: '#fafafa',
      textSecondary: '#d4d4d4',
      textMuted: '#a3a3a3',
    },
    accent: '#e5e5e5',
  },
  {
    id: 'moon',
    name: 'Moon',
    light: {
      background: '#f5f1e8',
      surface: '#fffdf7',
      border: '#e6ddc4',
      textPrimary: '#2b2417',
      textSecondary: '#5c5237',
      textMuted: '#8a7f5e',
    },
    dark: {
      background: '#1a1710',
      surface: '#252017',
      border: '#3d3623',
      textPrimary: '#f3edd8',
      textSecondary: '#cbbf94',
      textMuted: '#9a8f6a',
    },
    accent: '#eab308',
  },
  {
    id: 'purple',
    name: 'Purple',
    light: {
      background: '#faf8fd',
      surface: '#ffffff',
      border: '#e5ddf5',
      textPrimary: '#2e1a47',
      textSecondary: '#5b3d7a',
      textMuted: '#8768a3',
    },
    dark: {
      background: '#150f22',
      surface: '#1e1633',
      border: '#382a54',
      textPrimary: '#eee5fb',
      textSecondary: '#c7aeeb',
      textMuted: '#9d84c2',
    },
    accent: '#7c3aed',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    light: {
      background: '#fdf6e3',
      surface: '#eee8d5',
      border: '#d3cbb7',
      textPrimary: '#073642',
      textSecondary: '#586e75',
      textMuted: '#93a1a1',
    },
    dark: {
      background: '#002b36',
      surface: '#073642',
      border: '#0a4a5a',
      textPrimary: '#fdf6e3',
      textSecondary: '#eee8d5',
      textMuted: '#93a1a1',
    },
    accent: '#268bd2',
  },
  {
    id: 'blue-planet',
    name: 'Blue Planet',
    light: {
      background: '#eef6fc',
      surface: '#ffffff',
      border: '#cfe6f5',
      textPrimary: '#0b2942',
      textSecondary: '#1f4d6e',
      textMuted: '#4c7a99',
    },
    dark: {
      background: '#071a2c',
      surface: '#0d2740',
      border: '#194261',
      textPrimary: '#e3f2fc',
      textSecondary: '#a9d4ee',
      textMuted: '#6ea3c4',
    },
    accent: '#38bdf8',
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    light: {
      background: '#f4f4f8',
      surface: '#ffffff',
      border: '#dcdce6',
      textPrimary: '#14142b',
      textSecondary: '#39395c',
      textMuted: '#6b6b8f',
    },
    dark: {
      background: '#05050f',
      surface: '#0d0d1f',
      border: '#1e1e3a',
      textPrimary: '#e6e6f7',
      textSecondary: '#b3b3d9',
      textMuted: '#7a7aab',
    },
    accent: '#8b5cf6',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    light: {
      background: '#fdf6ec',
      surface: '#ffffff',
      border: '#efd9b3',
      textPrimary: '#402c14',
      textSecondary: '#70502a',
      textMuted: '#a17f4e',
    },
    dark: {
      background: '#241a0d',
      surface: '#332512',
      border: '#5a4322',
      textPrimary: '#fbeed9',
      textSecondary: '#e0c391',
      textMuted: '#ab8b5c',
    },
    accent: '#f59e0b',
  },
  {
    id: 'kepler-11e',
    name: 'Kepler-11e',
    light: {
      background: '#f6f5fd',
      surface: '#ffffff',
      border: '#dcd9f5',
      textPrimary: '#221c47',
      textSecondary: '#453a7a',
      textMuted: '#7267a3',
    },
    dark: {
      background: '#0e0b21',
      surface: '#161232',
      border: '#2c2456',
      textPrimary: '#e7e4fb',
      textSecondary: '#bdb4ec',
      textMuted: '#8a7fc2',
    },
    accent: '#6366f1',
  },
  {
    id: 'mars',
    name: 'Mars',
    light: {
      background: '#fdf2ef',
      surface: '#ffffff',
      border: '#f3d4cb',
      textPrimary: '#431a10',
      textSecondary: '#793623',
      textMuted: '#a8624a',
    },
    dark: {
      background: '#230e09',
      surface: '#331410',
      border: '#5c2820',
      textPrimary: '#fbe6e0',
      textSecondary: '#e6ac9b',
      textMuted: '#b17862',
    },
    accent: '#dc2626',
  },
  {
    id: 'laserwave',
    name: 'Laserwave',
    light: {
      background: '#fdf3fa',
      surface: '#ffffff',
      border: '#f3d6ec',
      textPrimary: '#3a1233',
      textSecondary: '#6e2c60',
      textMuted: '#a35c92',
    },
    dark: {
      background: '#1a0a1c',
      surface: '#291029',
      border: '#4d1f4a',
      textPrimary: '#f9e2f4',
      textSecondary: '#e0a3d3',
      textMuted: '#a5719c',
    },
    accent: '#ec4899',
  },
  {
    id: 'elysiajs',
    name: 'Elysia.js',
    light: {
      background: '#faf7fd',
      surface: '#ffffff',
      border: '#e9dcf7',
      textPrimary: '#2c1a42',
      textSecondary: '#553875',
      textMuted: '#8567a3',
    },
    dark: {
      background: '#170f24',
      surface: '#211735',
      border: '#3f2c5c',
      textPrimary: '#f1e7fb',
      textSecondary: '#cbabe8',
      textMuted: '#9a7fbf',
    },
    accent: '#a855f7',
  },
  {
    id: 'fastify',
    name: 'Fastify',
    light: {
      background: '#ffffff',
      surface: '#f6f6f6',
      border: '#e0e0e0',
      textPrimary: '#1a1a1a',
      textSecondary: '#404040',
      textMuted: '#737373',
    },
    dark: {
      background: '#000000',
      surface: '#171717',
      border: '#2e2e2e',
      textPrimary: '#fafafa',
      textSecondary: '#c7c7c7',
      textMuted: '#8f8f8f',
    },
    accent: '#4c4c4c',
  },
]

/**
 * Returns `theme` with the preset's light/dark colors and primary scale
 * applied. `colors.secondary`, `colors.neutral`, `mode`, and `depthColors`
 * are left untouched — same semantics as the platform's preset picker.
 */
export function applyPreset(theme: ThemeConfig, preset: ThemePreset): ThemeConfig {
  const primary = preset.primary ?? (preset.accent ? generateColorScale(preset.accent) : null)
  return {
    ...theme,
    ...(primary && { colors: { ...theme.colors, primary: { ...primary } } }),
    light: { ...preset.light },
    dark: { ...preset.dark },
  }
}

function sameModeColors(colors: ThemeModeColors | undefined, preset: PresetModeColors): boolean {
  return MODE_COLOR_KEYS.every((key) => (colors?.[key] ?? '').toLowerCase() === preset[key].toLowerCase())
}

/** Whether `theme` exactly matches a preset — used only to mark the active one. */
export function isPresetActive(theme: ThemeConfig | undefined, preset: ThemePreset): boolean {
  if (!sameModeColors(theme?.light, preset.light)) return false
  if (!sameModeColors(theme?.dark, preset.dark)) return false
  const expected = preset.primary?.[500] ?? (preset.accent && generateColorScale(preset.accent)?.[500])
  if (expected && (theme?.colors?.primary?.[500] ?? '').toLowerCase() !== expected.toLowerCase()) return false
  return true
}
