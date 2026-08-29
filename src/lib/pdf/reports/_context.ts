/**
 * Shared report context builder.
 *
 * Centralizes the "who is this report for" metadata (business identity, fiscal
 * year, period) so every report's preamble is consistent and never repeats the
 * same boilerplate.
 */

import type { Business } from '@/types'
import { getSellerTaxLabel } from '@/lib/localization'

export interface ReportMeta {
  businessName: string
  contactLine: string
  yearLabel?: string
  periodFrom?: string
  periodTo?: string
}

export function buildReportMeta(
  business: Pick<Business, 'name' | 'address' | 'phone' | 'email' | 'panNumber' | 'vatNumber' | 'taxRegistrationType' | 'taxRegistrationNumber'>,
  opts: { yearLabel?: string; periodFrom?: string; periodTo?: string } = {},
): ReportMeta {
  const sellerTax = getSellerTaxLabel(business)
  const taxLine =
    sellerTax.formattedText && sellerTax.formattedText !== 'PAN/VAT of the seller: N/A'
      ? sellerTax.formattedText
      : null

  const contactLine = [
    business.address,
    business.phone ? `Phone: ${business.phone}` : undefined,
    business.email ? business.email : undefined,
    taxLine || undefined,
  ]
    .filter((v): v is string => Boolean(v))
    .join('  |  ')

  return {
    businessName: (business.name || 'Inventory Lite Store').toUpperCase(),
    contactLine,
    yearLabel: opts.yearLabel,
    periodFrom: opts.periodFrom,
    periodTo: opts.periodTo,
  }
}
