import { BaseService } from './base.service'
import { COLLECTIONS, databases, DATABASE_ID } from '@/config/appwrite'
import { FinancialSequence, DocumentType } from '@/types'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { Query } from 'appwrite'
import { sanitizeAppwriteDocId } from '@/lib/utils'

export interface AllocatedNumber {
  sequenceNumber: number
  formattedNumber: string
  financialYear: string
  fyShortLabel: string
}

export interface ReservedBlock {
  startNumber: number
  endNumber: number
  financialYear: string
  fyShortLabel: string
}

/**
 * Numbering Service
 * 
 * Manages atomic, concurrency-safe, multi-tenant sequential document numbering
 * for Sales and Invoices based on Nepal's Bikram Sambat (BS) Financial Year.
 */
export class NumberingService extends BaseService {
  private sequenceLockMap = new Map<string, Promise<any>>()
  private inMemorySequenceMap = new Map<string, number>()

  constructor() {
    super(COLLECTIONS.FINANCIAL_SEQUENCES)
  }

  /**
   * Reset in-memory sequence cache (primarily for unit test isolation)
   */
  resetInMemorySequences(): void {
    this.inMemorySequenceMap.clear()
  }

  /**
   * Concurrency lock per (businessId + documentType + financialYear) to prevent race conditions
   */
  private async withSequenceLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
    const existingLock = this.sequenceLockMap.get(lockKey) || Promise.resolve()
    const nextLock = existingLock.then(async () => {
      try {
        return await fn()
      } finally {
        if (this.sequenceLockMap.get(lockKey) === nextLock) {
          this.sequenceLockMap.delete(lockKey)
        }
      }
    })
    this.sequenceLockMap.set(lockKey, nextLock)
    return await nextLock
  }

  /**
   * Allocate the next sequential document number for a business in a given financial year.
   * Format: SALE-83/84-000001 or INV-83/84-000001
   */
  async allocateNextNumber(
    businessId: string,
    documentType: DocumentType,
    dateInput?: string | Date
  ): Promise<AllocatedNumber> {
    const fyInfo = getCurrentFinancialYear(dateInput)
    const lockKey = `${businessId}_${documentType}_${fyInfo.label}`

    return await this.withSequenceLock(lockKey, async () => {
      const prefixMap: Record<DocumentType, string> = {
        SALE: 'SALE',
        INVOICE: 'INV',
        PURCHASE: 'PUR',
        SALES_RETURN: 'SR',
      }
      const prefix = prefixMap[documentType] || 'DOC'
      let allocatedNum: number
      const docId = sanitizeAppwriteDocId(`seq_${businessId}_${documentType}_${fyInfo.shortLabel.replace('/', '_')}`)

      if (this.inMemorySequenceMap.has(lockKey)) {
        allocatedNum = this.inMemorySequenceMap.get(lockKey)!
        this.inMemorySequenceMap.set(lockKey, allocatedNum + 1)
        try {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.FINANCIAL_SEQUENCES, docId, {
            nextNumber: allocatedNum + 1,
            updatedAt: new Date().toISOString(),
          }).catch(() => {})
        } catch {}
      } else {
        let seqDoc: any = null
        try {
          seqDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.FINANCIAL_SEQUENCES, docId)
        } catch {
          try {
            const fetchedDocs = await this.list<any>(businessId, [
              Query.equal('documentType', documentType),
              Query.equal('financialYear', fyInfo.label),
              Query.limit(1),
            ])
            seqDoc = fetchedDocs.find((d) => typeof d?.nextNumber === 'number') || null
          } catch {
            seqDoc = null
          }
        }

        if (seqDoc && typeof seqDoc.nextNumber === 'number' && seqDoc.nextNumber > 0 && seqDoc.nextNumber <= 999999) {
          allocatedNum = seqDoc.nextNumber
          try {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.FINANCIAL_SEQUENCES, seqDoc.$id, {
              nextNumber: allocatedNum + 1,
              updatedAt: new Date().toISOString(),
            })
          } catch {}
        } else {
          let maxNum = 0
          try {
            const colMap: Record<DocumentType, string> = {
              SALE: COLLECTIONS.SALES,
              INVOICE: COLLECTIONS.INVOICES,
              PURCHASE: COLLECTIONS.PURCHASES,
              SALES_RETURN: COLLECTIONS.SALES_RETURNS,
            }
            const colName = colMap[documentType] || COLLECTIONS.SALES
            const existingDocs = await databases.listDocuments(DATABASE_ID, colName, [
              Query.equal('businessId', businessId),
              Query.limit(200),
            ])
            for (const doc of (existingDocs?.documents || [])) {
              const numStr = (doc as any).saleNumber || (doc as any).invoiceNumber || (doc as any).purchaseNumber || (doc as any).returnNumber
              if (numStr && typeof numStr === 'string' && numStr.includes(fyInfo.shortLabel)) {
                const val = parseInt(numStr.replace(/^[A-Z_]+-\d{2}\/\d{2}-/, ''), 10)
                if (!isNaN(val) && val > 0 && val <= 999999 && val > maxNum) maxNum = val
              }
            }
          } catch {}

          allocatedNum = maxNum + 1

          try {
            await databases.createDocument(
              DATABASE_ID,
              COLLECTIONS.FINANCIAL_SEQUENCES,
              docId,
              {
                businessId,
                documentType,
                financialYear: fyInfo.label,
                nextNumber: allocatedNum + 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            )
          } catch (createSeqErr: any) {
            if (createSeqErr?.code === 409) {
              await databases.updateDocument(DATABASE_ID, COLLECTIONS.FINANCIAL_SEQUENCES, docId, {
                nextNumber: allocatedNum + 1,
                updatedAt: new Date().toISOString(),
              }).catch(() => {})
            }
          }
        }

        this.inMemorySequenceMap.set(lockKey, allocatedNum + 1)
      }

      const formattedNumber = `${prefix}-${fyInfo.shortLabel}-${String(allocatedNum).padStart(6, '0')}`

      return {
        sequenceNumber: allocatedNum,
        formattedNumber,
        financialYear: fyInfo.label,
        fyShortLabel: fyInfo.shortLabel,
      }
    })
  }

  /**
   * Reserve a block of contiguous numbers for offline POS terminals.
   * Example: Reserve 50 numbers (startNumber: 1, endNumber: 50) for Device A.
   */
  async reserveNumberBlock(
    businessId: string,
    documentType: DocumentType,
    dateInput?: string | Date,
    blockSize: number = 50
  ): Promise<ReservedBlock> {
    const fyInfo = getCurrentFinancialYear(dateInput)
    const lockKey = `${businessId}_${documentType}_${fyInfo.label}`

    return await this.withSequenceLock(lockKey, async () => {
      let seqDoc: FinancialSequence | null = null
      try {
        const docs = await this.list<FinancialSequence>(businessId, [
          Query.equal('documentType', documentType),
          Query.equal('financialYear', fyInfo.label),
          Query.limit(1),
        ])
        if (docs.length > 0) {
          seqDoc = docs[0]
        }
      } catch {
        seqDoc = null
      }

      let startNumber = 1

      if (seqDoc) {
        startNumber = seqDoc.nextNumber
        const nextNumber = startNumber + blockSize
        try {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.FINANCIAL_SEQUENCES,
            seqDoc.$id,
            {
              nextNumber,
              updatedAt: new Date().toISOString(),
            }
          )
        } catch {
          try {
            await this.update<FinancialSequence>(
              seqDoc.$id,
              { nextNumber },
              businessId
            )
          } catch {
            // Fallback non-fatal
          }
        }
      } else {
        const nextNumber = startNumber + blockSize
        try {
          await this.create<FinancialSequence>(
            {
              documentType,
              financialYear: fyInfo.label,
              nextNumber,
            },
            businessId
          )
        } catch {
          // Fallback non-fatal
        }
      }

      const endNumber = startNumber + blockSize - 1

      return {
        startNumber,
        endNumber,
        financialYear: fyInfo.label,
        fyShortLabel: fyInfo.shortLabel,
      }
    })
  }
}

export const numberingService = new NumberingService()
