/**
 * Business Intelligence & Audit Center Engine
 * 
 * Analyzes sales, invoices, expenses, customers, and inventory data
 * to produce human-readable, context-aware financial health summaries,
 * audit checks, severity classifications, and step-by-step action guidance.
 */

import { Sale, Invoice, Customer, Expense, Product } from '@/types'
import { formatCurrency } from '@/lib/utils'

export type IssueSeverity = 'ok' | 'needs_review' | 'action_required' | 'info'

export interface AffectedRecord {
  type: 'sale' | 'invoice' | 'customer' | 'expense' | 'product'
  id: string
  label: string
  subLabel?: string
  details?: {
    expected?: number
    recorded?: number
    difference?: number
    date?: string
    [key: string]: any
  }
  url: string
}

export interface ReportIssue {
  id: string
  title: string
  titleNe?: string
  severity: IssueSeverity
  category:
    | 'payment_reconciliation'
    | 'invoice_sequence'
    | 'duplicate_invoice'
    | 'math_mismatch'
    | 'data_completeness'
    | 'cancelled_sales'
    | 'customer_dues'
    | 'expenses'
    | 'vat_info'
    | 'stock'
  summary: string
  summaryNe?: string
  whatHappened: string
  whatHappenedNe?: string
  whyShown: string
  whyShownNe?: string
  recommendedAction: string
  recommendedActionNe?: string
  actionSteps: string[]
  actionStepsNe?: string[]
  affectedCount: number
  differenceAmount?: number
  affectedRecords: AffectedRecord[]
}

export interface BusinessHealthSummary {
  overallStatus: 'ok' | 'needs_review' | 'action_required'
  overallMessage: string
  overallMessageNe: string
  dataQuality: 'good' | 'review_recommended' | 'incomplete'
  dataQualityMessage: string
  dataQualityMessageNe: string
  issuesCount: {
    ok: number
    needs_review: number
    action_required: number
    info: number
  }
  issues: ReportIssue[]
}

/**
 * Analyzes all application data and builds the Business Intelligence & Audit summary
 */
export function analyzeBusinessHealth(
  sales: Sale[],
  invoices: Invoice[],
  customers: Customer[],
  expenses: Expense[],
  _products: Product[]
): BusinessHealthSummary {
  const issues: ReportIssue[] = []

  // 1. PAYMENT RECONCILIATION
  const paymentMismatchRecords: AffectedRecord[] = []
  let totalPaymentDiff = 0

  sales.forEach((s) => {
    if (s.status === 'cancelled') return

    const total = s.total || 0
    const paid = s.paidAmount || 0
    const due = s.dueAmount || 0
    const expectedPaid = Math.max(0, total - due)
    const diff = paid - expectedPaid

    // Mismatch threshold > 0.50 (to ignore minor rounding fractions)
    if (Math.abs(diff) > 0.50) {
      totalPaymentDiff += Math.abs(diff)
      const saleLabel = s.saleNumber || `Sale #${s.$id.substring(0, 8)}`
      const invLabel = s.invoiceNumber ? `Invoice #${s.invoiceNumber}` : undefined

      paymentMismatchRecords.push({
        type: 'sale',
        id: s.$id,
        label: saleLabel,
        subLabel: invLabel ? `${invLabel} (${s.customerName || 'Walk-in Customer'})` : (s.customerName || 'Walk-in Customer'),
        details: {
          expected: total,
          recorded: paid,
          difference: Math.abs(diff),
          date: (s.createdAt || '').slice(0, 10),
          status: s.status,
          paymentMethod: s.paymentMethod || 'cash',
        },
        url: `/app/sales/${s.$id}`,
      })
    }
  })

  if (paymentMismatchRecords.length > 0) {
    issues.push({
      id: 'issue-payment-recon',
      title: 'Payment amount needs review',
      titleNe: 'भुक्तानी रकम समीक्षा गर्नुपर्छ',
      severity: 'needs_review',
      category: 'payment_reconciliation',
      summary: `${paymentMismatchRecords.length} sale(s) have a difference between bill total and recorded payment.`,
      summaryNe: `${paymentMismatchRecords.length} बिक्रीमा बिल रकम र रेकर्ड गरिएको भुक्तानी बीच फरक छ।`,
      whatHappened: `The recorded payment amount does not match the bill total for ${paymentMismatchRecords.length} sale(s). Total variance: ${formatCurrency(totalPaymentDiff)}.`,
      whatHappenedNe: `${paymentMismatchRecords.length} वटा बिक्रीमा रेकर्ड गरिएको भुक्तानी रकम र कुल बिल रकम बीच मेल खाएको छैन। कुल फरक: ${formatCurrency(totalPaymentDiff)}।`,
      whyShown: 'Inventory Lite compares the bill total with recorded payments to highlight potential payment entry or change recording oversights.',
      whyShownNe: 'इन्भेन्टरी लाइटले भुक्तानी प्रविष्टि वा फिर्ता खुद्रा रेकर्डिङमा हुन सक्ने गल्तीहरू देखाउन बिल रकम र भुक्तानी तुलना गर्दछ।',
      recommendedAction: 'Open the affected sale(s) and verify the payment amount received and change returned.',
      recommendedActionNe: 'प्रभावित बिक्री खोलेर प्राप्त भुक्तानी र खुद्रा फिर्ता रकम जाँच गर्नुहोस्।',
      actionSteps: [
        'Click "View Sale" on the affected transaction below.',
        'Compare the bill total with the actual cash/online payment received.',
        'Check whether change returned was omitted or extra deposit was recorded.',
        'Update the payment record if necessary.',
      ],
      actionStepsNe: [
        'तलको प्रभावित कारोबारमा "बिक्री हेर्नुहोस्" मा क्लिक गर्नुहोस्।',
        'कुल बिल रकम र प्राप्त वास्तविक भुक्तानी तुलना गर्नुहोस्।',
        'खुदरा फिर्ता छुट भएको वा अतिरिक्त रकम प्रविष्टि भएको छ कि हेर्नुहोस्।',
        'आवश्यक परेमा भुक्तानी विवरण सच्याउनुहोस्।',
      ],
      affectedCount: paymentMismatchRecords.length,
      differenceAmount: totalPaymentDiff,
      affectedRecords: paymentMismatchRecords,
    })
  } else {
    issues.push({
      id: 'issue-payment-ok',
      title: 'Payment Reconciliation',
      titleNe: 'भुक्तानी मिलान',
      severity: 'ok',
      category: 'payment_reconciliation',
      summary: 'All recorded payments match their corresponding sale totals.',
      summaryNe: 'सबै रेकर्ड गरिएका भुक्तानीहरू बिक्री बिलसँग मिलेका छन्।',
      whatHappened: 'All payments recorded match expected bill amounts.',
      whatHappenedNe: 'रेकर्ड गरिएका सबै भुक्तानीहरू बिल रकमसँग मिलेका छन्।',
      whyShown: 'System checked all non-cancelled sales for payment consistency.',
      whyShownNe: 'प्रणालीले सबै बिक्रीहरूको भुक्तानी स्थिरता जाँच गरेको छ।',
      recommendedAction: 'No action needed.',
      recommendedActionNe: 'कुनै कार्य आवश्यक छैन।',
      actionSteps: [],
      affectedCount: 0,
      affectedRecords: [],
    })
  }

  // 2. DUPLICATE INVOICE NUMBERS
  const invMap = new Map<string, Invoice[]>()
  invoices.forEach((inv) => {
    if (!inv.invoiceNumber) return
    const num = inv.invoiceNumber.trim()
    const list = invMap.get(num) || []
    list.push(inv)
    invMap.set(num, list)
  })

  const duplicateInvoiceRecords: AffectedRecord[] = []
  invMap.forEach((list, num) => {
    if (list.length > 1) {
      list.forEach((inv) => {
        duplicateInvoiceRecords.push({
          type: 'invoice',
          id: inv.$id,
          label: `Invoice #${num}`,
          subLabel: `Customer: ${inv.customerName || 'Walk-in'} (${(inv.createdAt || '').slice(0, 10)})`,
          url: `/app/invoices/${inv.$id}`,
        })
      })
    }
  })

  if (duplicateInvoiceRecords.length > 0) {
    issues.push({
      id: 'issue-duplicate-invoices',
      title: 'Duplicate invoice numbers found',
      titleNe: 'दोहोरिएका इन्भ्वाइस नम्बरहरू भेटिए',
      severity: 'action_required',
      category: 'duplicate_invoice',
      summary: `${duplicateInvoiceRecords.length} invoices share duplicate invoice numbers.`,
      summaryNe: `${duplicateInvoiceRecords.length} वटा इन्भ्वाइसहरूमा एउटै नम्बर दोहोरिएको छ।`,
      whatHappened: 'The exact same invoice number has been assigned to multiple billing records.',
      whatHappenedNe: 'एउटै इन्भ्वाइस नम्बर एकभन्दा बढी बिलमा प्रयोग भएको छ।',
      whyShown: 'Sequential invoicing requires each invoice to have a unique identifier for audit compliance.',
      whyShownNe: 'लेखा परीक्षण मान्यता अनुसार प्रत्येक बिलको छुट्टाछुट्टै अद्वितिय इन्भ्वाइस नम्बर हुनुपर्छ।',
      recommendedAction: 'Review duplicate invoices and update invoice prefix/numbering settings.',
      recommendedActionNe: 'दोहोरिएका इन्भ्वाइस समीक्षा गरी नम्बर सच्याउनुहोस्।',
      actionSteps: [
        'Open the duplicate invoices listed below.',
        'Verify which invoice is the correct original bill.',
        'Cancel or re-number duplicate entries.',
      ],
      actionStepsNe: [
        'तल सूचीकृत दोहोरिएका इन्भ्वाइसहरू खोल्नुहोस्।',
        'कुन बिल वास्तविक हो पुष्टि गर्नुहोस्।',
        'दोहोरिएको प्रविष्टि सच्याउनुहोस् वा रद्द गर्नुहोस्।',
      ],
      affectedCount: duplicateInvoiceRecords.length,
      affectedRecords: duplicateInvoiceRecords,
    })
  }

  // 3. INVOICE SEQUENCE GAPS
  const extractSeqNum = (numStr: string): number | null => {
    const match = numStr.match(/(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  }

  const seqInvoices = invoices
    .map((inv) => ({ inv, seq: extractSeqNum(inv.invoiceNumber || '') }))
    .filter((item): item is { inv: Invoice; seq: number } => item.seq !== null)
    .sort((a, b) => a.seq - b.seq)

  let gapCount = 0
  const gapRecords: AffectedRecord[] = []
  for (let i = 1; i < seqInvoices.length; i++) {
    const prev = seqInvoices[i - 1].seq
    const curr = seqInvoices[i].seq
    if (curr - prev > 1) {
      gapCount += curr - prev - 1
      gapRecords.push({
        type: 'invoice',
        id: seqInvoices[i].inv.$id,
        label: `Gap between #${seqInvoices[i - 1].inv.invoiceNumber} and #${seqInvoices[i].inv.invoiceNumber}`,
        subLabel: `Missing ${curr - prev - 1} number(s) in sequence`,
        url: `/app/invoices/${seqInvoices[i].inv.$id}`,
      })
    }
  }

  if (gapCount > 0) {
    issues.push({
      id: 'issue-invoice-sequence',
      title: 'Invoice sequence gaps detected',
      titleNe: 'इन्भ्वाइस क्रममा खाली ठाउँ (ग्याप) भेटियो',
      severity: 'needs_review',
      category: 'invoice_sequence',
      summary: `${gapCount} missing sequence number(s) detected in invoices.`,
      summaryNe: `${gapCount} वटा इन्भ्वाइस नम्बरहरू क्रमबद्ध रूपमा छुटेका छन्।`,
      whatHappened: 'Invoice numbers do not follow a continuous sequence (numbers are skipped).',
      whatHappenedNe: 'इन्भ्वाइस नम्बरहरू लगातार क्रममा छैनन् (बीचमा नम्बरहरू छुटेका छन्)।',
      whyShown: 'Tax auditors check for missing invoice numbers. Gaps can happen if bills were cancelled or numbering was reset.',
      whyShownNe: 'कर अधिकारीहरूले छुटेका बिल नम्बरहरू जाँच गर्छन्। बिल रद्द हुँदा वा नम्बर रिसेट गर्दा ग्याप हुन सक्छ।',
      recommendedAction: 'Check if skipped numbers correspond to cancelled bills or test invoices.',
      recommendedActionNe: 'छुटेका नम्बरहरू रद्द गरिएका बिल हुन् कि होइनन् जाँच गर्नुहोस्।',
      actionSteps: [
        'Check cancelled invoices list to confirm if skipped numbers were cancelled.',
        'If an invoice was deleted accidentally, record an explanatory audit note.',
      ],
      actionStepsNe: [
        'छुटेका नम्बर रद्द गरिएका हुन् कि भनेर रद्द गरिएका इन्भ्वाइसहरू जाँच गर्नुहोस्।',
        'यदि भुलवश हटाइएको भए लेखा टिप्पणी राख्नुहोस्।',
      ],
      affectedCount: gapCount,
      affectedRecords: gapRecords.slice(0, 10),
    })
  }

  // 4. CANCELLED SALES
  const cancelledSales = sales.filter((s) => s.status === 'cancelled')
  if (cancelledSales.length > 0) {
    const cancelledRecords: AffectedRecord[] = cancelledSales.map((s) => ({
      type: 'sale',
      id: s.$id,
      label: s.saleNumber || `Sale #${s.$id.substring(0, 8)}`,
      subLabel: `${s.customerName || 'Walk-in Customer'} — Total: ${formatCurrency(s.total || 0)}`,
      url: `/app/sales/${s.$id}`,
    }))

    issues.push({
      id: 'issue-cancelled-sales',
      title: 'Cancelled sales review',
      titleNe: 'रद्द गरिएका बिक्रीहरूको समीक्षा',
      severity: 'info',
      category: 'cancelled_sales',
      summary: `${cancelledSales.length} sale(s) have been cancelled.`,
      summaryNe: `${cancelledSales.length} वटा बिक्री रद्द गरिएका छन्।`,
      whatHappened: `${cancelledSales.length} invoice(s)/sale(s) were marked as cancelled.`,
      whatHappenedNe: `${cancelledSales.length} वटा बिक्री वा बिलहरू रद्द गरिएका थिए।`,
      whyShown: 'Cancelled sales impact inventory levels and revenue reports. They should be reviewed periodically.',
      whyShownNe: 'रद्द गरिएका बिक्रीहरूले मौज्दात र आम्दानी रिपोर्टमा असर गर्छन्। तिनलाई समय-समयमा समीक्षा गर्नुपर्छ।',
      recommendedAction: 'Verify that all cancelled sales have valid business reasons.',
      recommendedActionNe: 'सबै रद्द गरिएका बिक्रीहरूको कारण उपयुक्त छ कि छैन पुष्टि गर्नुहोस्।',
      actionSteps: [
        'Review the list of cancelled bills.',
        'Ensure stock adjustments for cancelled sales reflect physical inventory.',
      ],
      actionStepsNe: [
        'रद्द गरिएका बिलहरूको सूची समीक्षा गर्नुहोस्।',
        'स्टक समायोजन सही छ कि छैन पुष्टि गर्नुहोस्।',
      ],
      affectedCount: cancelledSales.length,
      affectedRecords: cancelledRecords.slice(0, 10),
    })
  }

  // 5. CUSTOMER DUES
  const duesCustomers = customers.filter((c) => (c.totalDue || 0) > 0)
  const totalDuesAmount = duesCustomers.reduce((sum, c) => sum + (c.totalDue || 0), 0)

  if (duesCustomers.length > 0) {
    const duesRecords: AffectedRecord[] = duesCustomers.map((c) => ({
      type: 'customer',
      id: c.$id,
      label: c.name,
      subLabel: `Outstanding Due: ${formatCurrency(c.totalDue || 0)}${c.phone ? ` • Phone: ${c.phone}` : ''}`,
      url: `/app/customers/${c.$id}`,
    }))

    issues.push({
      id: 'issue-customer-dues',
      title: 'Outstanding customer dues (Udha)',
      titleNe: 'उठ्न बाँकी ग्राहक उदारो (उधारो)',
      severity: 'info',
      category: 'customer_dues',
      summary: `${duesCustomers.length} customer(s) have outstanding balances totaling ${formatCurrency(totalDuesAmount)}.`,
      summaryNe: `${duesCustomers.length} जना ग्राहकको कुल ${formatCurrency(totalDuesAmount)} रकम उठ्न बाँकी छ।`,
      whatHappened: `Customers owe a combined balance of ${formatCurrency(totalDuesAmount)} to your shop.`,
      whatHappenedNe: `ग्राहकहरूबाट कुल ${formatCurrency(totalDuesAmount)} रकम पसलमा उठ्न बाँकी छ।`,
      whyShown: 'Tracking customer credit ensures healthy cash flow and prevents uncollected debts.',
      whyShownNe: 'उधारो हिसाब ट्र्याक गर्नाले नगद प्रवाह स्वस्थ रहन्छ र नउठ्ने जोखिम कम हुन्छ।',
      recommendedAction: 'Send payment reminders or record collections when payments arrive.',
      recommendedActionNe: 'ग्राहकलाई भुक्तानी स्मरण गराउनुहोस् वा भुक्तानी प्राप्त हुँदा दाखिला गर्नुहोस्।',
      actionSteps: [
        'Open customer profiles to view itemized transaction ledgers.',
        'Record partial or full credit collection when received.',
      ],
      actionStepsNe: [
        'ग्राहक प्रोफाइल खोलेर लेजर विवरण हेर्नुहोस्।',
        'भुक्तानी प्राप्त भएपछि क्रेडिट दाखिला रेकर्ड गर्नुहोस्।',
      ],
      affectedCount: duesCustomers.length,
      differenceAmount: totalDuesAmount,
      affectedRecords: duesRecords.slice(0, 10),
    })
  } else {
    issues.push({
      id: 'issue-dues-ok',
      title: 'No customer dues',
      titleNe: 'कुनै ग्राहकको उधारो बाँकी छैन',
      severity: 'ok',
      category: 'customer_dues',
      summary: "You're all caught up. No customers currently have outstanding payments.",
      summaryNe: 'सबै चुक्ता भइसकेको छ। हाल कुनै ग्राहकको उधारो बाँकी छैन।',
      whatHappened: 'Zero customer dues outstanding.',
      whatHappenedNe: 'ग्राहकको कुनै उधारो बाँकी छैन।',
      whyShown: 'System checked all customer ledger balances.',
      whyShownNe: 'प्रणालीले सबै ग्राहक लेजर ब्यालेन्स जाँच गरेको छ।',
      recommendedAction: 'Great job maintaining cash collection!',
      recommendedActionNe: 'नगद सङ्कलन व्यवस्थित राख्नुभएकोमा बधाई छ!',
      actionSteps: [],
      affectedCount: 0,
      affectedRecords: [],
    })
  }

  // 6. EXPENSES SUMMARY
  if (expenses.length === 0) {
    issues.push({
      id: 'issue-expenses-info',
      title: 'No expenses recorded',
      titleNe: 'कुनै खर्च रेकर्ड गरिएको छैन',
      severity: 'info',
      category: 'expenses',
      summary: 'No business expenses have been recorded for this period.',
      summaryNe: 'यस अवधिमा कुनै व्यापारिक खर्च रेकर्ड गरिएको छैन।',
      whatHappened: 'Zero expense records found in selected date range.',
      whatHappenedNe: 'छानिएको मिति भित्र कुनै खर्च भेटिएन।',
      whyShown: 'Recording operational expenses (rent, electricity, transport) is necessary to calculate accurate net profit.',
      whyShownNe: 'वास्तविक खुद नाफा निकाल्न पसलको खर्च (भाडा, बिजुली, ढुवानी) रेकर्ड गर्न आवश्यक छ।',
      recommendedAction: 'Add business expenses in the Expenses tab to improve profit estimation.',
      recommendedActionNe: 'नाफाको सही हिसाब पाउन "खर्च" ट्याबमा गएर खर्चहरू थप्नुहोस्।',
      actionSteps: ['Go to Expenses tab and click "Add Expense".'],
      actionStepsNe: ['"खर्च" ट्याबमा गएर "खर्च थप्नुहोस्" मा क्लिक गर्नुहोस्।'],
      affectedCount: 0,
      affectedRecords: [],
    })
  }

  // 7. COMPUTE OVERALL HEALTH & DATA QUALITY
  const actionRequiredCount = issues.filter((i) => i.severity === 'action_required').length
  const needsReviewCount = issues.filter((i) => i.severity === 'needs_review').length
  const infoCount = issues.filter((i) => i.severity === 'info').length
  const okCount = issues.filter((i) => i.severity === 'ok').length

  let overallStatus: 'ok' | 'needs_review' | 'action_required' = 'ok'
  let overallMessage = 'Everything looks good'
  let overallMessageNe = 'सबै विवरणहरू ठीक र मिलेका छन्'

  if (actionRequiredCount > 0) {
    overallStatus = 'action_required'
    overallMessage = `${actionRequiredCount} action required item(s)`
    overallMessageNe = `${actionRequiredCount} वटा विषयमा तुरुन्त ध्यान दिनुपर्छ`
  } else if (needsReviewCount > 0) {
    overallStatus = 'needs_review'
    overallMessage = `${needsReviewCount} item(s) need review`
    overallMessageNe = `${needsReviewCount} वटा विषय समीक्षा गर्नुपर्छ`
  }

  let dataQuality: 'good' | 'review_recommended' | 'incomplete' = 'good'
  let dataQualityMessage = 'Most required records are complete and consistent.'
  let dataQualityMessageNe = 'सबै मुख्य रेकर्डहरू पूर्ण र मिलेका छन्।'

  if (actionRequiredCount > 0) {
    dataQuality = 'incomplete'
    dataQualityMessage = 'Important records have inconsistencies or missing data that need attention.'
    dataQualityMessageNe = 'केही महत्त्वपूर्ण रेकर्डहरूमा बेमेल वा छुटेका विवरणहरू छन्।'
  } else if (needsReviewCount > 0) {
    dataQuality = 'review_recommended'
    dataQualityMessage = 'Some records have minor variances that are recommended for review.'
    dataQualityMessageNe = 'केही रेकर्डहरू समीक्षा गर्न सिफारिस गरिन्छ।'
  }

  return {
    overallStatus,
    overallMessage,
    overallMessageNe,
    dataQuality,
    dataQualityMessage,
    dataQualityMessageNe,
    issuesCount: {
      ok: okCount,
      needs_review: needsReviewCount,
      action_required: actionRequiredCount,
      info: infoCount,
    },
    issues,
  }
}
