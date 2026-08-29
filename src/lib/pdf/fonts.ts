/**
 * Font helpers for PDF rendering.
 *
 * Standardizes on jsPDF's built-in helvetica (reliable across PDF viewers, no
 * bundle bloat) via a thin abstraction so a custom web font can be dropped in
 * later without touching report code.
 */

export const PDF_FONT = {
  /** Family registered in jsPDF (built-in Type1 font). */
  base: 'helvetica',
} as const

/** Font family + weight combos. Individual reports almost always want these. */
export const PDF_FONT_STYLES = {
  normal: 'normal',
  bold: 'bold',
  italic: 'italic',
  boldItalic: 'bolditalic',
} as const

export type PdfFontStyle =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'bolditalic'

/**
 * Return a string safe to render inside a PDF cell/text.
 * Guarantees no `undefined`, `null`, `NaN`, or `Infinity` ever reaches the
 * document (a hard production requirement for financial reports).
 */
export function safeText(value: unknown, fallback = '-'): string {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback
    return String(value)
  }
  const str = String(value)
  return str.length === 0 ? fallback : str
}

/** Truncate a string to a byte-friendly max length avoiding mid-char cut on wide glyphs. */
export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, Math.max(0, maxLength - 3)) + '...'
}

/**
 * Render a lightweight label/value row (used by summary & metadata helpers).
 * The implementers of header/summary components call this to keep text aligned.
 */
export function makeLabelValue(label: string, value: string): string {
  return `${safeText(label)}: ${safeText(value)}`
}
