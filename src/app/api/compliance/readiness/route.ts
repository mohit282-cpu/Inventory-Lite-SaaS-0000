import { NextRequest, NextResponse } from 'next/server'
import { accountingService } from '@/services/accounting.service'
import { taxEngineService } from '@/services/tax-engine.service'
import { fiscalYearService } from '@/services/fiscal-year.service'
import { cbmsAdapterService } from '@/services/cbms-adapter.service'
import { invoiceService } from '@/services/invoice.service'
import { isAccountingInitialized } from '@/lib/accounting-bootstrap'

/**
 * GET /api/compliance/readiness
 * 
 * Returns a comprehensive IRD compliance readiness assessment for a business.
 * This is a READ-ONLY endpoint — no data is modified.
 * 
 * IMPORTANT: This system is "IRD Compliance Ready" — NOT "IRD Approved".
 * Do NOT claim IRD certification or approval.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter is required' },
        { status: 400 }
      )
    }

    // Run all checks in parallel for performance
    const [
      accountingInitialized,
      accounts,
      taxRates,
      fiscalYear,
      cbmsReadiness,
      cbmsStats,
      issuedInvoices,
      lockedInvoices,
    ] = await Promise.allSettled([
      isAccountingInitialized(businessId),
      accountingService.listActiveAccounts(businessId),
      taxEngineService.listTaxRates(businessId),
      fiscalYearService.getCurrentOpenFiscalYear(businessId),
      cbmsAdapterService.checkReadiness(businessId),
      cbmsAdapterService.getSubmissionStats(businessId),
      invoiceService.listInvoicesByStatus(businessId, 'ISSUED'),
      invoiceService.listInvoicesByStatus(businessId, 'LOCKED'),
    ])

    // Build readiness checklist
    const checklist = [
      {
        id: 'accounting_initialized',
        name: 'Chart of Accounts',
        description: 'Nepal SME default chart of accounts provisioned',
        status: accountingInitialized.status === 'fulfilled' && accountingInitialized.value ? 'pass' : 'fail',
        details: `${accounts.status === 'fulfilled' ? accounts.value.length : 0} accounts configured`,
      },
      {
        id: 'tax_configured',
        name: 'Tax Rates Configured',
        description: 'VAT rates and tax categories are set up',
        status: taxRates.status === 'fulfilled' && taxRates.value.length > 0 ? 'pass' : 'fail',
        details: `${taxRates.status === 'fulfilled' ? taxRates.value.length : 0} tax rates configured`,
      },
      {
        id: 'fiscal_year',
        name: 'Fiscal Year Active',
        description: 'Current Nepal fiscal year (BS) is open',
        status: fiscalYear.status === 'fulfilled' && fiscalYear.value ? 'pass' : 'fail',
        details: fiscalYear.status === 'fulfilled' && fiscalYear.value ? fiscalYear.value.name : 'No active fiscal year',
      },
      {
        id: 'vat_default_rate',
        name: 'VAT 13% Default Rate',
        description: 'Standard Nepal VAT rate (13%) is configured as default',
        status: taxRates.status === 'fulfilled' &&
          taxRates.value.some(r => r.rate === 13 && r.isDefault && r.status === 'ACTIVE')
          ? 'pass' : 'fail',
        details: 'Required for Nepal IRD compliance',
      },
      {
        id: 'invoice_numbering',
        name: 'Invoice Numbering',
        description: 'Sequential invoice numbering with fiscal year prefix',
        status: 'pass', // Always pass — numbering is built-in
        details: 'INV-YY/YY-NNNNNN format',
      },
      {
        id: 'cbms_connection',
        name: 'CBMS Integration',
        description: 'Central Billing Management System connectivity',
        status: cbmsReadiness.status === 'fulfilled' &&
          cbmsReadiness.value.cbmsIntegrationStatus !== 'NOT_CONFIGURED'
          ? 'pass' : 'warning',
        details: cbmsReadiness.status === 'fulfilled'
          ? `Submissions: ${cbmsReadiness.value.cbmsSubmissionCount} total, ${cbmsReadiness.value.cbmsAcceptedCount} accepted`
          : 'Not configured (compliance-ready mode)',
      },
      {
        id: 'invoice_lifecycle',
        name: 'Invoice Lifecycle',
        description: 'Invoices follow DRAFT→VALIDATED→ISSUED→LOCKED workflow',
        status: issuedInvoices.status === 'fulfilled' || lockedInvoices.status === 'fulfilled' ? 'pass' : 'warning',
        details: `${issuedInvoices.status === 'fulfilled' ? issuedInvoices.value.length : 0} issued, ${lockedInvoices.status === 'fulfilled' ? lockedInvoices.value.length : 0} locked`,
      },
    ]

    // Calculate overall readiness score
    const passed = checklist.filter(c => c.status === 'pass').length
    const warnings = checklist.filter(c => c.status === 'warning').length
    const failed = checklist.filter(c => c.status === 'fail').length
    const total = checklist.length
    const score = Math.round(((passed + warnings * 0.5) / total) * 100)

    return NextResponse.json({
      businessId,
      assessmentDate: new Date().toISOString(),
      overallScore: score,
      overallStatus: failed === 0 ? (warnings === 0 ? 'FULLY_READY' : 'MOSTLY_READY') : 'NEEDS_CONFIGURATION',
      disclaimer: 'This system is IRD Compliance Ready. It is NOT IRD Approved or Certified.',
      checklist,
      cbmsStats: cbmsStats.status === 'fulfilled' ? cbmsStats.value : null,
      summary: {
        totalChecks: total,
        passed,
        warnings,
        failed,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
