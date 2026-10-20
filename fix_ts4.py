#!/usr/bin/env python3
with open('src/services/sale.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Current structure (lines 545-588):
old_section = """    // Idempotency check: if key provided and a completed cancellation exists for this key, return early
    if (idempotencyKey) {
      const persistentCheck = async (): Promise<Sale | null> => {
        const matches = await this.list<Sale>(businessId, [
          Query.equal('idempotencyKey', idempotencyKey),
          Query.limit(1),
        ])
        const matchedSale = matches.length > 0 ? matches[0] : null
        if (matchedSale && matchedSale.$id === sale.$id) {
          return matchedSale
        }
        return null
      }

      const existing = await idempotencyManager.executeIdempotentTransaction(
        {
          idempotencyKey,
          businessId,
          operationType: 'cancel_sale',
          payload: { saleId, reason },
          resourceType: 'sale',
          enforceKey: true,
        },
        persistentCheck,
        async () => {
          // Return early if already completed
          const freshSale = await this.getSale(saleId, businessId)
          if (freshSale.cancellationStatus === this.CANCELLATION_STATUSES.COMPLETED) {
            return { success: true, cancellationStatus: 'cancelled' }
          }
          if (freshSale.cancellationStatus === this.CANCELLATION_STATUSES.FAILED) {
            return { success: false, cancellationStatus: 'cancel_failed', error: 'Previous cancellation failed; reconciliation required' }
          }
          return null
        }
      )

      if (existing?.cancellationStatus === this.CANCELLATION_STATUSES.COMPLETED) {
        return { success: true, cancellationStatus: 'cancelled' }
      }
      if (existing?.cancellationStatus === this.CANCELLATION_STATUSES.FAILED) {
        return { success: false, cancellationStatus: 'cancel_failed', error: existing.error || 'Previous cancellation failed' }
      }
    }"""

new_section = """    // Idempotency check: if key provided and a completed cancellation exists for this key, return early
    let earlyReturnResult: { success: boolean; cancellationStatus: string; error?: string } | null = null
    if (idempotencyKey) {
      const persistentCheck = async (): Promise<Sale | null> => {
        const matches = await this.list<Sale>(businessId, [
          Query.equal('idempotencyKey', idempotencyKey),
          Query.limit(1),
        ])
        const matchedSale = matches.length > 0 ? matches[0] : null
        if (matchedSale && matchedSale.$id === sale.$id) {
          return matchedSale
        }
        return null
      }

      const existingFromCheck = await idempotencyManager.executeIdempotentTransaction(
        {
          idempotencyKey,
          businessId,
          operationType: 'cancel_sale',
          payload: { saleId, reason },
          resourceType: 'sale',
          enforceKey: true,
        },
        persistentCheck,
        async () => {
          // Main cancellation operation - no early returns here
          return null
        }
      )

      // Check if the cancellation was already completed or failed from the persistent check
      if (existingFromCheck?.cancellationStatus === this.CANCELLATION_STATUSES.COMPLETED) {
        earlyReturnResult = { success: true, cancellationStatus: 'cancelled' }
      } else if (existingFromCheck?.cancellationStatus === this.CANCELLATION_STATUSES.FAILED) {
        earlyReturnResult = { success: false, cancellationStatus: 'cancel_failed', error: existingFromCheck.error || 'Previous cancellation failed; reconciliation required' }
      }
    }

    // If we had an early return, return now
    if (earlyReturnResult) {
      return earlyReturnResult
    }"""

if old_section in content:
    content = content.replace(old_section, new_section)
    with open('src/services/sale.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Section replaced')
else:
    print('FAIL: old section not found')
    # Debug: print lines 545-550
    lines = content.split('\n')
    for i in range(544, 555):
        if i < len(lines):
            print(f"{i+1}: {lines[i]}")