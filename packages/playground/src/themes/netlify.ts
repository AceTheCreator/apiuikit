import type { ConfigInterface } from 'apiuikit'

type ThemeConfig = NonNullable<ConfigInterface['theme']>

/**
 * A Netlify-flavoured theme for the rendered spec, anchored on the brand teal
 * (#00C7B7) and the deep navy Netlify uses for dark surfaces (#0E1E25).
 *
 * Two constraints from the config shape shaped the choices below:
 *
 * - `colors` is not per-mode: one primary ramp has to serve both light and
 *   dark. So the recognisable bright teal sits at 200/300, where it is used
 *   for borders and accents, while 500-700 step down to darker teals that stay
 *   legible as text. Straight #00C7B7 only reaches ~2.1:1 on white, too low for
 *   the small labels that use `text-primary-500`.
 *
 *   500 in particular is a deliberate compromise: it is used as text over the
 *   near-white `primary-50` *and* over dark backgrounds, and no single value
 *   clears 4.5:1 against both (the ceiling for any such value is ~3.98:1).
 *   #008C7F maximises the worst case at 3.68:1, clearing the 3:1 bar that
 *   applies to icons and UI accents everywhere it appears.
 * - `neutral` is deliberately left alone. buildThemeVars applies an inverted
 *   neutral scale for dark mode and lets an explicit `colors.neutral` override
 *   it, but that override is shared across modes, so setting it here would
 *   leak light neutrals into dark mode.
 */
export const netlifyTheme: ThemeConfig = {
  colors: {
    primary: {
      50: '#E6FAF7',
      100: '#B8F0E9',
      200: '#7FE3D7',
      // The Netlify logo teal itself, kept where it reads as an accent rather
      // than as text.
      300: '#00C7B7',
      500: '#008C7F',
      600: '#006F65',
      700: '#00524B',
    },
  },
  light: {
    background: '#F5F8F8',
    surface: '#FFFFFF',
    border: '#DDE5E5',

    textPrimary: '#0E1E25',
    textSecondary: '#37505A',
    textMuted: '#5A737E',
  },
  dark: {
    background: '#0E1E25',
    surface: '#14282F',
    border: '#21363E',

    textPrimary: '#E3ECEF',
    textSecondary: '#A9BEC6',
    textMuted: '#7B959F',
  },
}
