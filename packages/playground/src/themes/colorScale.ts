// Mirrors platform/apps/web/lib/colorScale.ts — keep the two in sync.

export const COLOR_SCALE_STEPS = ['50', '100', '200', '300', '500', '600', '700'] as const
export type ColorScaleStep = (typeof COLOR_SCALE_STEPS)[number]
export type HexColorScale = Record<ColorScaleStep, string>

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Fraction blended toward white (255) for shades lighter than 500. */
const LIGHT_MIX: Record<'50' | '100' | '200' | '300', number> = {
  '50': 0.9,
  '100': 0.8,
  '200': 0.65,
  '300': 0.45,
}

/** Fraction blended toward black (0) for shades darker than 500. */
const DARK_MIX: Record<'600' | '700', number> = {
  '600': 0.15,
  '700': 0.3,
}

function normalizeHex(input: string): string | null {
  const trimmed = input.trim()
  if (!HEX_PATTERN.test(trimmed)) return null
  const hex = trimmed.slice(1)
  const expanded = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  return `#${expanded.toLowerCase()}`
}

function hexToChannels(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function channelsToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function mixToward(channels: [number, number, number], target: number, fraction: number): [number, number, number] {
  return channels.map((c) => c + (target - c) * fraction) as [number, number, number]
}

/**
 * Turns a single hex color into a full 50–700 tint/shade scale by blending
 * toward white (light steps) or black (dark steps) in RGB space — the
 * rendered docs pull different UI elements from different steps of the same
 * scale, so setting only `500` (as the simple color pickers used to) left
 * every other step on the library's stock default color.
 *
 * Returns `null` for anything that isn't a valid 3- or 6-digit hex color —
 * callers should leave prior state untouched in that case rather than
 * clobbering it, since this is expected mid-edit input from a free-text field.
 */
export function generateColorScale(input: string): HexColorScale | null {
  const normalized = normalizeHex(input)
  if (!normalized) return null

  const base = hexToChannels(normalized)
  const scale = { '500': normalized } as HexColorScale

  for (const step of Object.keys(LIGHT_MIX) as (keyof typeof LIGHT_MIX)[]) {
    scale[step] = channelsToHex(mixToward(base, 255, LIGHT_MIX[step]))
  }
  for (const step of Object.keys(DARK_MIX) as (keyof typeof DARK_MIX)[]) {
    scale[step] = channelsToHex(mixToward(base, 0, DARK_MIX[step]))
  }

  return scale
}
