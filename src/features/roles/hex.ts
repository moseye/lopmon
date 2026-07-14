import { z } from 'zod'

// Accepts '#RGB', 'RGB', '#RRGGBB', 'RRGGBB' in any case.
const HEX_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const HexInput = z
  .string()
  .trim()
  .refine((v) => HEX_RE.test(v), 'Not a valid hex color (e.g. #A020F0 or F0A).')

/** Canonicalize to '#RRGGBB' uppercase, expanding 3-digit shorthand. */
export function canonicalizeHex(input: string): string {
  let h = input.trim().replace(/^#/, '').toUpperCase()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${h}`
}

/** '#RRGGBB' -> 0xRRGGBB integer for a discord.js role color. */
export function hexToInt(canonical: string): number {
  return Number.parseInt(canonical.replace(/^#/, ''), 16)
}

/**
 * Role color int, remapping pure black (0, which Discord treats as "no color") to near-black
 * so #000000 names actually render dark instead of inheriting the default color.
 */
export function hexToRoleColor(canonical: string): number {
  const n = hexToInt(canonical)
  return n === 0 ? 0x010101 : n
}
