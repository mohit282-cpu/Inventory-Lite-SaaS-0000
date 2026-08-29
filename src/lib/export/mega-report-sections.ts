/**
 * Mega Business Report — section registry.
 *
 * Shared section keys used by the Export UI's include-section checkboxes and
 * consumed by both the PDF and Excel generators to honor the user's selection.
 */

export const MEGA_SECTIONS = {
  executive_summary: 'Executive Summary',
  reconciliation: 'Financial Reconciliation',
  sales_register: 'Sales Register',
  purchase_register: 'Purchase Register',
  sales_returns: 'Sales Returns',
  returns_adjustments: 'Returns & Adjustments',
  customers: 'Customers',
  customer_ledger: 'Customer Ledger',
  customer_receivables: 'Customer Udhaar / Receivables',
  suppliers: 'Suppliers',
  supplier_ledger: 'Supplier Ledger',
  supplier_payables: 'Supplier Payables',
  payments: 'Payments Register',
  expenses: 'Expenses',
  products: 'Products',
  categories: 'Categories',
  stock_valuation: 'Stock & Valuation',
  stock_movement: 'Stock Movement',
  profit_loss: 'Profit & Loss',
  vat_summary: 'VAT / Tax Summary',
  credit_notes: 'Credit Notes',
  debit_notes: 'Debit Notes',
  invoices: 'Invoice Register',
  audit_trail: 'Audit Trail',
  cancelled_documents: 'Cancelled Documents',
  ird_readiness: 'IRD Readiness',
  ird_reconciliation: 'IRD Reconciliation',
  data_integrity: 'Data Integrity',
} as const

export type MegaSectionKey = keyof typeof MEGA_SECTIONS

export const MEGA_SECTION_KEYS: MegaSectionKey[] = Object.keys(MEGA_SECTIONS) as MegaSectionKey[]

export const ALL_MEGA_SECTIONS: Set<MegaSectionKey> = new Set(MEGA_SECTION_KEYS)

export function sectionEnabled(include: Set<MegaSectionKey> | undefined, key: MegaSectionKey): boolean {
  if (!include || include.size === 0) return true
  return include.has(key)
}
