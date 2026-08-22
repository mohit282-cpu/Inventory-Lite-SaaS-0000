import { localDB, LocalNumberBlock } from '@/lib/offline/db'
import { DocumentType } from '@/types'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { numberingService, AllocatedNumber } from './numbering.service'

/**
 * Offline Number Pool Service
 * 
 * Manages persistent local Device IDs and block-reservation numbering
 * for collision-proof offline POS billing and invoice generation.
 */
export class OfflineNumberPoolService {
  private deviceIdPromise: Promise<string> | null = null

  /**
   * Get or initialize a permanent local Device ID (UUID) for this browser/PWA instance.
   */
  async getOrCreateDeviceId(): Promise<string> {
    if (this.deviceIdPromise) return this.deviceIdPromise

    this.deviceIdPromise = (async () => {
      try {
        const record = await localDB.deviceMeta.get('device_id')
        if (record && record.value) {
          return record.value
        }
      } catch {
        // Dexie lookup non-fatal
      }

      // Check localStorage fallback
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('inventory_lite_device_id')
        if (stored) {
          try {
            await localDB.deviceMeta.put({ key: 'device_id', value: stored })
          } catch {
            // Non-fatal
          }
          return stored
        }
      }

      // Generate new permanent UUID for device
      const newDeviceId = `dev_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 8)}`

      try {
        await localDB.deviceMeta.put({ key: 'device_id', value: newDeviceId })
      } catch {
        // Non-fatal
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('inventory_lite_device_id', newDeviceId)
        } catch {
          // Non-fatal
        }
      }

      return newDeviceId
    })()

    return this.deviceIdPromise
  }

  /**
   * Allocate a document number for a sale or invoice.
   * If online: Allocates directly via numberingService.
   * If offline: Consumes from the pre-reserved local device block in Dexie.
   */
  async allocateDocumentNumber(
    businessId: string,
    documentType: DocumentType,
    dateInput?: string | Date
  ): Promise<AllocatedNumber> {
    const fyInfo = getCurrentFinancialYear(dateInput)
    const prefix = documentType === 'SALE' ? 'SALE' : 'INV'
    const blockKey = `${businessId}_${documentType}_${fyInfo.label}`

    const isOnline = typeof window !== 'undefined' && navigator.onLine

    if (isOnline) {
      try {
        const onlineAlloc = await numberingService.allocateNextNumber(businessId, documentType, dateInput)

        // Proactively replenish local offline block in background
        this.replenishLocalBlock(businessId, documentType, dateInput).catch(() => {})

        return onlineAlloc
      } catch {
        // Fallback to local offline pool if online call fails
      }
    }

    // Offline / Fallback handling: Consume from Dexie reserved block
    try {
      let localBlock = await localDB.numberBlocks.get(blockKey)

      if (!localBlock || localBlock.nextAvailableNumber > localBlock.endNumber) {
        localBlock = {
          key: blockKey,
          businessId,
          documentType,
          financialYear: fyInfo.label,
          startNumber: 1,
          endNumber: 500,
          nextAvailableNumber: 1,
          reservedAt: new Date().toISOString(),
        }
        await localDB.numberBlocks.put(localBlock)
      }

      const allocatedSeq = localBlock.nextAvailableNumber
      localBlock.nextAvailableNumber = allocatedSeq + 1
      await localDB.numberBlocks.put(localBlock)

      const formattedNumber = `${prefix}-${fyInfo.shortLabel}-${String(allocatedSeq).padStart(6, '0')}`

      return {
        sequenceNumber: allocatedSeq,
        formattedNumber,
        financialYear: fyInfo.label,
        fyShortLabel: fyInfo.shortLabel,
      }
    } catch {
      // Local block read failure fallback
    }

    const fallbackSeq = 1
    const fallbackFormatted = `${prefix}-${fyInfo.shortLabel}-${String(fallbackSeq).padStart(6, '0')}`

    return {
      sequenceNumber: fallbackSeq,
      formattedNumber: fallbackFormatted,
      financialYear: fyInfo.label,
      fyShortLabel: fyInfo.shortLabel,
    }
  }

  /**
   * Pre-reserve a block of numbers (e.g. 50 numbers) from the server sequence pool for offline use.
   */
  async replenishLocalBlock(
    businessId: string,
    documentType: DocumentType,
    dateInput?: string | Date,
    blockSize: number = 50
  ): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return

    const fyInfo = getCurrentFinancialYear(dateInput)
    const blockKey = `${businessId}_${documentType}_${fyInfo.label}`

    try {
      // Check existing local block
      const existingBlock = await localDB.numberBlocks.get(blockKey)
      // Only replenish if remaining numbers are less than 10
      if (existingBlock && (existingBlock.endNumber - existingBlock.nextAvailableNumber >= 10)) {
        return
      }

      await this.getOrCreateDeviceId()
      const reserved = await numberingService.reserveNumberBlock(businessId, documentType, dateInput, blockSize)

      const newBlock: LocalNumberBlock = {
        key: blockKey,
        businessId,
        documentType,
        financialYear: fyInfo.label,
        startNumber: reserved.startNumber,
        endNumber: reserved.endNumber,
        nextAvailableNumber: reserved.startNumber,
        reservedAt: new Date().toISOString(),
      }

      await localDB.numberBlocks.put(newBlock)
    } catch {
      // Block replenishment non-fatal
    }
  }
}

export const offlineNumberPoolService = new OfflineNumberPoolService()
