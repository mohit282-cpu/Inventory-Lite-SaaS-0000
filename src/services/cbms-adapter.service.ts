import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { CbmsSubmission, CbmsSubmissionStatus, IrdReadinessStatus, IrdReconciliationItem } from '@/types'
import { Query } from 'appwrite'

/**
 * CBMS (Central Billing Management System) Adapter
 * 
 * Integration layer for Nepal IRD's electronic billing system.
 * Designed as a pluggable adapter — uses interface-based approach
 * so the actual IRD API can be swapped in when available.
 * 
 * IMPORTANT: This system is "IRD Compliance Ready" — NOT "IRD Approved".
 * Do NOT claim IRD certification or approval.
 */
export class CbmsAdapterService extends BaseService {
  constructor() {
    super(COLLECTIONS.CBMS_SUBMISSIONS)
  }

  // ==================== IRD Readiness Check ====================

  /**
   * Check if a business is technically ready for IRD electronic billing.
   * Returns a comprehensive readiness assessment.
   */
  async checkReadiness(businessId: string): Promise<IrdReadinessStatus> {
    // This would check:
    // 1. Business has PAN/VAT registered
    // 2. Invoice format meets IRD spec
    // 3. Tax rates are configured
    // 4. Chart of accounts is set up
    // 5. CBMS credentials are configured (if API is connected)

    const submissions = await this.list<CbmsSubmission>(businessId)
    const accepted = submissions.filter(s => s.status === 'ACCEPTED')
    const pending = submissions.filter(s => s.status === 'QUEUED' || s.status === 'SUBMITTED')
    const failed = submissions.filter(s => s.status === 'FAILED' || s.status === 'REJECTED')

    const lastSubmission = submissions.sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    )[0]

    return {
      businessId,
      businessName: '',
      panNumber: '',
      vatNumber: '',
      vatRegistrationStatus: 'NOT_REGISTERED',
      currentFiscalYear: '',
      electronicBillingStatus: 'Not Configured',
      cbmsIntegrationStatus: submissions.length === 0 ? 'NOT_CONFIGURED' : 'NOT_SUBMITTED',
      cbmsSubmissionCount: submissions.length,
      cbmsAcceptedCount: accepted.length,
      cbmsPendingCount: pending.length,
      cbmsFailedCount: failed.length,
      lastAttemptAt: lastSubmission?.createdAt,
      lastSuccessfulSubmissionAt: accepted.sort((a, b) =>
        (b.acceptedAt || '').localeCompare(a.acceptedAt || '')
      )[0]?.acceptedAt,
      approvalVerified: false,
    }
  }

  // ==================== Invoice Submission ====================

  /**
   * Queue an invoice for CBMS submission.
   * In compliance-ready mode, this stores the record but does NOT actually submit to IRD.
   */
  async queueForSubmission(
    input: {
      invoiceId: string
      invoiceNumber: string
      invoiceDate: string
      totalAmount: number
      taxAmount: number
      customerPan?: string
    },
    businessId: string,
    userId: string
  ): Promise<CbmsSubmission> {
    // Check if already queued
    const existing = await this.list<CbmsSubmission>(businessId, [
      Query.equal('invoiceId', input.invoiceId),
    ])
    if (existing.length > 0 && existing[0].status !== 'FAILED' && existing[0].status !== 'REJECTED') {
      throw new Error(`Invoice '${input.invoiceNumber}' is already queued for CBMS submission`)
    }

    return await this.create<CbmsSubmission>(
      {
        ...input,
        status: 'DRAFT' as CbmsSubmissionStatus,
        retryCount: 0,
      },
      businessId,
      userId
    )
  }

  /**
   * Submit queued invoices to CBMS.
   * NOTE: In compliance-ready mode, this simulates submission.
   * When real IRD API is available, replace with actual HTTP call.
   */
  async submitToCbms(submissionId: string, businessId: string): Promise<CbmsSubmission> {
    const submission = await this.getById<CbmsSubmission>(submissionId, businessId)

    if (submission.status !== 'DRAFT' && submission.status !== 'QUEUED' && submission.status !== 'RETRYING') {
      throw new Error(`Cannot submit invoice in '${submission.status}' status`)
    }

    // Mark as submitting
    await this.update<CbmsSubmission>(
      submissionId,
      {
        status: 'SUBMITTED' as CbmsSubmissionStatus,
        submittedAt: new Date().toISOString(),
      },
      businessId
    )

    // === COMPLIANCE-READY SIMULATION ===
    // When actual IRD API is available, replace this block with:
    // const response = await irdApi.submitInvoice(submission)
    // and handle the response accordingly.

    // For now, mark as accepted (simulated)
    return await this.update<CbmsSubmission>(
      submissionId,
      {
        status: 'ACCEPTED' as CbmsSubmissionStatus,
        acceptedAt: new Date().toISOString(),
        externalReference: `SIM-${Date.now()}`,
        responseCode: '200',
        responseMessage: 'Simulated acceptance (compliance-ready mode)',
      },
      businessId
    )
  }

  /**
   * Retry a failed submission.
   */
  async retrySubmission(submissionId: string, businessId: string): Promise<CbmsSubmission> {
    const submission = await this.getById<CbmsSubmission>(submissionId, businessId)

    if (submission.status !== 'FAILED' && submission.status !== 'REJECTED') {
      throw new Error('Only failed or rejected submissions can be retried')
    }

    if (submission.retryCount >= 3) {
      throw new Error('Maximum retry attempts (3) exceeded. Manual intervention required.')
    }

    return await this.update<CbmsSubmission>(
      submissionId,
      {
        status: 'RETRYING' as CbmsSubmissionStatus,
        retryCount: submission.retryCount + 1,
        lastRetryAt: new Date().toISOString(),
      },
      businessId
    )
  }

  // ==================== Reconciliation ====================

  /**
   * Get reconciliation items — comparing local invoices with CBMS submissions.
   */
  async getReconciliationItems(
    businessId: string,
    options?: {
      dateFrom?: string
      dateTo?: string
      status?: string
    }
  ): Promise<IrdReconciliationItem[]> {
    const submissions = await this.list<CbmsSubmission>(businessId)

    let filtered = submissions
    if (options?.dateFrom) {
      filtered = filtered.filter(s => s.invoiceDate >= options.dateFrom!)
    }
    if (options?.dateTo) {
      filtered = filtered.filter(s => s.invoiceDate <= options.dateTo!)
    }

    return filtered.map(s => ({
      id: s.$id,
      invoiceNumber: s.invoiceNumber,
      invoiceDate: s.invoiceDate,
      totalAmount: s.totalAmount,
      localStatus: 'ISSUED',
      irdStatus: this.mapSubmissionStatus(s.status),
      submissionDate: s.submittedAt,
      externalReference: s.externalReference,
      resultMessage: s.responseMessage,
    }))
  }

  // ==================== Submission List & Stats ====================

  /**
   * List all CBMS submissions with filters.
   */
  async listSubmissions(
    businessId: string,
    options?: {
      status?: CbmsSubmissionStatus
      dateFrom?: string
      dateTo?: string
      limit?: number
    }
  ): Promise<CbmsSubmission[]> {
    const queries: any[] = []
    if (options?.status) {
      queries.push(Query.equal('status', options.status))
    }
    if (options?.dateFrom) {
      queries.push(Query.greaterThanEqual('invoiceDate', options.dateFrom))
    }
    if (options?.dateTo) {
      queries.push(Query.lessThanEqual('invoiceDate', options.dateTo))
    }
    if (options?.limit) {
      queries.push(Query.limit(options.limit))
    }
    queries.push(Query.orderDesc('createdAt'))

    return await this.list<CbmsSubmission>(businessId, queries)
  }

  /**
   * Get CBMS submission statistics.
   */
  async getSubmissionStats(businessId: string): Promise<{
    total: number
    draft: number
    queued: number
    submitted: number
    accepted: number
    rejected: number
    failed: number
    retrying: number
  }> {
    const all = await this.list<CbmsSubmission>(businessId)
    return {
      total: all.length,
      draft: all.filter(s => s.status === 'DRAFT').length,
      queued: all.filter(s => s.status === 'QUEUED').length,
      submitted: all.filter(s => s.status === 'SUBMITTED').length,
      accepted: all.filter(s => s.status === 'ACCEPTED').length,
      rejected: all.filter(s => s.status === 'REJECTED').length,
      failed: all.filter(s => s.status === 'FAILED').length,
      retrying: all.filter(s => s.status === 'RETRYING').length,
    }
  }

  // ==================== Private Helpers ====================

  private mapSubmissionStatus(status: CbmsSubmissionStatus): IrdReconciliationItem['irdStatus'] {
    const map: Record<CbmsSubmissionStatus, IrdReconciliationItem['irdStatus']> = {
      DRAFT: 'NOT_CONFIGURED',
      QUEUED: 'PENDING',
      SUBMITTED: 'PENDING',
      ACCEPTED: 'MATCHED',
      REJECTED: 'REJECTED',
      FAILED: 'FAILED',
      RETRYING: 'PENDING',
    }
    return map[status] || 'NOT_CONFIGURED'
  }
}

export const cbmsAdapterService = new CbmsAdapterService()
