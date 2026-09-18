import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { auditLogService } from './audit-log.service'

export type TransactionState =
  | 'PENDING'
  | 'VALIDATING'
  | 'SALE_CREATED'
  | 'ITEMS_CREATED'
  | 'STOCK_UPDATED'
  | 'CUSTOMER_BALANCE_UPDATED'
  | 'INVOICE_CREATED'
  | 'ACCOUNTING_POSTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RECOVERY_REQUIRED'
  | 'CANCELLED'

export interface TransactionStateRecord {
  $id: string
  operationId: string
  businessId: string
  operationType: string
  resourceId?: string
  currentState: TransactionState
  attemptCount: number
  lastError?: string
  recoveryRequired: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

const VALID_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  PENDING: ['VALIDATING', 'SALE_CREATED', 'FAILED', 'CANCELLED'],
  VALIDATING: ['SALE_CREATED', 'ITEMS_CREATED', 'FAILED', 'CANCELLED'],
  SALE_CREATED: ['ITEMS_CREATED', 'STOCK_UPDATED', 'FAILED', 'RECOVERY_REQUIRED', 'CANCELLED'],
  ITEMS_CREATED: ['STOCK_UPDATED', 'CUSTOMER_BALANCE_UPDATED', 'FAILED', 'RECOVERY_REQUIRED', 'CANCELLED'],
  STOCK_UPDATED: ['CUSTOMER_BALANCE_UPDATED', 'INVOICE_CREATED', 'ACCOUNTING_POSTED', 'COMPLETED', 'FAILED', 'RECOVERY_REQUIRED'],
  CUSTOMER_BALANCE_UPDATED: ['INVOICE_CREATED', 'ACCOUNTING_POSTED', 'COMPLETED', 'FAILED', 'RECOVERY_REQUIRED'],
  INVOICE_CREATED: ['ACCOUNTING_POSTED', 'COMPLETED', 'FAILED', 'RECOVERY_REQUIRED'],
  ACCOUNTING_POSTED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['PENDING', 'VALIDATING', 'RECOVERY_REQUIRED', 'CANCELLED'],
  RECOVERY_REQUIRED: ['PENDING', 'VALIDATING', 'COMPLETED', 'CANCELLED'],
  CANCELLED: [],
}

export class TransactionTrackerService extends BaseService {
  private inMemoryStates = new Map<string, TransactionStateRecord>()

  constructor() {
    super(COLLECTIONS.AUDIT_LOGS)
  }

  /**
   * Validate state transition rules
   */
  isValidTransition(fromState: TransactionState, toState: TransactionState): boolean {
    if (fromState === toState) return true
    const allowed = VALID_TRANSITIONS[fromState] || []
    return allowed.includes(toState)
  }

  /**
   * Start a new tracked transaction
   */
  async startTransaction(params: {
    businessId: string
    operationType: string
    userId: string
    resourceId?: string
    idempotencyKey?: string
  }): Promise<TransactionStateRecord> {
    const { businessId, operationType, userId, resourceId, idempotencyKey } = params
    const operationId = idempotencyKey || `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const record: TransactionStateRecord = {
      $id: operationId,
      operationId,
      businessId,
      operationType,
      resourceId: resourceId || '',
      currentState: 'PENDING',
      attemptCount: 1,
      recoveryRequired: false,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.inMemoryStates.set(`${businessId}:${operationId}`, record)

    try {
      await auditLogService.record({
        businessId,
        entityType: 'transaction_state',
        entityId: operationId,
        action: 'CREATE',
        changes: {
          state: { old: null, new: 'PENDING' },
          operationType: { old: null, new: operationType },
          resourceId: { old: null, new: resourceId || '' },
        },
        performedBy: userId,
      })
    } catch {
      // Audit log fallback
    }

    return record
  }

  /**
   * Transition transaction to next valid state
   */
  async updateState(params: {
    operationId: string
    businessId: string
    currentState: TransactionState
    userId: string
    resourceId?: string
    lastError?: string
    recoveryRequired?: boolean
  }): Promise<TransactionStateRecord> {
    const { operationId, businessId, currentState, userId, resourceId, lastError, recoveryRequired } = params
    const key = `${businessId}:${operationId}`
    const existing = this.inMemoryStates.get(key)

    const previousState: TransactionState = existing ? existing.currentState : 'PENDING'
    if (existing && !this.isValidTransition(previousState, currentState)) {
      console.warn(`[TransactionTracker] Invalid state transition attempted: ${previousState} -> ${currentState}`)
    }

    const updatedRecord: TransactionStateRecord = {
      $id: operationId,
      operationId,
      businessId,
      operationType: existing ? existing.operationType : 'transaction',
      resourceId: resourceId || (existing ? existing.resourceId : ''),
      currentState,
      attemptCount: existing ? existing.attemptCount + 1 : 1,
      lastError: lastError || existing?.lastError,
      recoveryRequired: recoveryRequired ?? (currentState === 'RECOVERY_REQUIRED'),
      createdBy: existing ? existing.createdBy : userId,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: currentState === 'COMPLETED' ? new Date().toISOString() : undefined,
    }

    this.inMemoryStates.set(key, updatedRecord)

    try {
      await auditLogService.record({
        businessId,
        entityType: 'transaction_state',
        entityId: operationId,
        action: 'UPDATE',
        changes: {
          state: { old: previousState, new: currentState },
          lastError: { old: null, new: lastError || '' },
          recoveryRequired: { old: null, new: updatedRecord.recoveryRequired },
        },
        performedBy: userId,
      })
    } catch {
      // Non-fatal audit log catch
    }

    return updatedRecord
  }

  /**
   * Mark transaction as completed
   */
  async markCompleted(
    operationId: string,
    businessId: string,
    userId: string,
    resultResourceId?: string
  ): Promise<TransactionStateRecord> {
    return await this.updateState({
      operationId,
      businessId,
      currentState: 'COMPLETED',
      userId,
      resourceId: resultResourceId,
      recoveryRequired: false,
    })
  }

  /**
   * Mark transaction as failed or recovery required
   */
  async markFailed(
    operationId: string,
    businessId: string,
    userId: string,
    error: string,
    recoveryRequired: boolean = false
  ): Promise<TransactionStateRecord> {
    const targetState: TransactionState = recoveryRequired ? 'RECOVERY_REQUIRED' : 'FAILED'
    return await this.updateState({
      operationId,
      businessId,
      currentState: targetState,
      userId,
      lastError: error,
      recoveryRequired,
    })
  }

  /**
   * Get transaction state for an operation
   */
  getTransaction(operationId: string, businessId: string): TransactionStateRecord | null {
    return this.inMemoryStates.get(`${businessId}:${operationId}`) || null
  }
}

export const transactionTracker = new TransactionTrackerService()
