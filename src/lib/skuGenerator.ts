/**
 * SKU Generation Utility
 * 
 * Deterministic, readable SKU generation based on product name.
 * Generates SKUs in the format: TOKEN1-TOKEN2-...-NNN
 * 
 * Tokenization strategy:
 * - Convert name to uppercase
 * - Trim and normalize whitespace
 * - Remove special characters (keep alphanumeric and spaces)
 * - Split into alphanumeric tokens
 * - Tokens containing digits are preserved entirely
 * - Other tokens: take first 3 characters
 * - Tokens joined with hyphens
 * - Sequential suffix appended (-001, -002, etc.)
 */

// Regex to match tokens containing at least one digit
const HAS_DIGIT_REGEX = /\d/
// Regex to normalize multiple spaces
const NORMALIZE_SPACES_REGEX = /\s+/g

/**
 * Tokenize a product name into SKU component tokens.
 * Internal use - does not append suffix.
 * 
 * Handles: Latin scripts, numbers, special characters, and falls back gracefully
 * for non-Latin or special-character-only names.
 */
export function tokenizeProductName(name: string): string[] {
  if (!name || name.trim().length === 0) return []

  const upper = name.toUpperCase().trim()
  // Keep alphanumeric, spaces, and common Unicode characters (accents, etc.)
  // Remove only truly problematic control characters
  const cleaned = upper.replace(/[^\x20-\x7E\s]/g, '').replace(/[^A-Za-z0-9\s]/g, '').replace(NORMALIZE_SPACES_REGEX, ' ')
  const tokens = cleaned.split(' ').filter((t) => t.length > 0)

  if (tokens.length === 0) {
    // Fallback: use first 3 characters of the original name (preserving some identity)
    const fallback = name.trim().substring(0, 3).toUpperCase()
    return [fallback]
  }

  return tokens.map((token) => {
    if (HAS_DIGIT_REGEX.test(token)) {
      return token
    }
    return token.substring(0, 3)
  })
}

/**
 * Generate the base SKU from a product name (without sequential suffix).
 * 
 * Examples:
 *   'Aata'           -> 'AAT'
 *   'Ganga Jal'      -> 'GAN-JAL'
 *   'Coca Cola 500ml'-> 'COC-COL-500ML'
 *   'Wai Wai Noodles'-> 'WAI-WAI-NOO'
 *   'Samsung Galaxy S24' -> 'SAM-GAL-S24'
 *   'USB Type C Cable' -> 'USB-TYP-CAB'
 *   'LED Bulb 12W'   -> 'LED-BUL-12W'
 */
export function generateBaseSku(name: string): string {
  const tokens = tokenizeProductName(name)
  return tokens.join('-')
}

/**
 * Find the next available sequential suffix for a given base SKU.
 * 
 * @param existingSkus - Set of existing SKUs in the business
 * @param base - The base SKU tokens (without suffix)
 * @returns The next available suffix string (e.g., '001', '002')
 */
export function findNextSuffix(existingSkus: Set<string>, base: string): string {
  let i = 1
  while (true) {
    const suffix = String(i).padStart(3, '0')
    const candidate = `${base}-${suffix}`
    if (!existingSkus.has(candidate)) {
      return suffix
    }
    i++
  }
}

/**
 * Generate a complete, unique SKU from a product name.
 * 
 * @param name - The product name
 * @param existingSkus - Set of already-existing SKUs (base names without suffix, or full SKUs)
 * @returns A unique SKU string such as 'AAT-001', 'GAN-JAL-001', etc.
 * 
 * @example
 *   generateSku('Aata', new Set())          // 'AAT-001'
 *   generateSku('Ganga Jal', new Set())      // 'GAN-JAL-001'
 *   generateSku('Coca Cola 500ml', new Set()) // 'COC-COL-500ML-001'
 */
export function generateSku(
  name: string,
  existingSkus: Set<string>
): string {
  const base = generateBaseSku(name)

  // Check if base + '001' is available; if not, find next suffix
  const initialSuffix = '001'
  const candidate = `${base}-${initialSuffix}`

  if (!existingSkus.has(candidate)) {
    return candidate
  }

  return findNextSuffix(existingSkus, base)
}

/**
 * Parse an SKU into its base tokens and numeric suffix.
 * 
 * Returns { base, suffix } where suffix is the numeric part after the last hyphen,
 * or null if the SKU does not match the expected pattern.
 * 
 * @example
 *   parseSku('AAT-001')  // { base: 'AAT', suffix: '001' }
 *   parseSku('GAN-JAL-001') // { base: 'GAN-JAL', suffix: '001' }
 *   parseSku('COC-COL-500ML-001') // { base: 'COC-COL-500ML', suffix: '001' }
 */
export function parseSku(sku: string): { base: string; suffix: string } | null {
  const match = sku.match(/^(.+?)-(\d{3})$/)
  if (!match) return null
  return { base: match[1], suffix: match[2] }
}

/**
 * Extract the base SKU (without suffix) from a full SKU string.
 * 
 * @example
 *   extractBaseSku('AAT-001')  // 'AAT'
 *   extractBaseSku('GAN-JAL-001') // 'GAN-JAL'
 */
export function extractBaseSku(sku: string): string {
  const parsed = parseSku(sku)
  return parsed ? parsed.base : sku
}