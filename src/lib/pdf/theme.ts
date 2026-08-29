/**
 * PDF design-system theme tokens.
 *
 * All reports share these values so every exported PDF has a consistent,
 * production-grade accounting appearance regardless of which generator produced it.
 * Colors are kept restrained and print/bw-friendly.
 */

import { PDF_FONT } from './fonts'

export { PDF_FONT }

export const PDF_COLORS = {
  // Ink / neutrals
  ink900: [15, 23, 42] as const, // slate-900 – darkest text / primary bars
  ink800: [30, 41, 59] as const, // slate-800 – section headers / table head
  ink700: [51, 65, 85] as const, // slate-700 – body labels
  ink600: [71, 85, 105] as const, // slate-600 – body text
  ink500: [100, 116, 139] as const, // slate-500 – muted / footer text
  ink300: [203, 213, 225] as const, // slate-300 – subtle borders
  line200: [226, 232, 240] as const, // slate-200 – card borders
  canvas50: [248, 250, 252] as const, // slate-50 – summary card fill
  canvas100: [241, 245, 249] as const, // slate-100 – totals bar fill
  white: [255, 255, 255] as const,

  // Accent (restrained, print-safe)
  accent900: [30, 58, 138] as const, // blue-900 – report emphasis text
  accent700: [29, 78, 216] as const, // blue-700 – accents
  accent100: [239, 246, 255] as const, // blue-50 – accent card fill
  accentBorder: [191, 219, 254] as const, // blue-200

  // Semantic (money)
  positive800: [6, 95, 70] as const, // emerald-800 – in/qty positive
  positive700: [4, 120, 87] as const, // emerald-700
  negative800: [153, 27, 27] as const, // red-800 – out/negative
  negative700: [185, 28, 28] as const, // red-700

  // Zebra striping
  zebra: [248, 250, 252] as const, // slate-50
} as const

export const PDF_SPACING = {
  pageMargin: 14,
  sectionGap: 6,
  blockGap: 4,
  tableCellPadding: 3,
  denseCellPadding: 2.5,
  footerHeight: 12,
  headerBarHeight: 24,
  summaryCardHeight: 22,
  totalsBarHeight: 10,
} as const

export const PDF_LAYOUT = {
  a4Width: 210,
  a4Height: 297,
  landscapeWidth: 297,
  landscapeHeight: 210,
} as const

export type PdfOrientation = 'portrait' | 'landscape'
