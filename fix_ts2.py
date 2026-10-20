#!/usr/bin/env python3
with open('src/services/sale.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# The current broken structure (lines 559-568):
#       const existing = await idempotencyManager.executeIdempotentTransaction(
#         {
#           idempotencyKey,
#           businessId,
#           operationType: 'cancel_sale',
#           payload: { saleId, reason },
#           resourceType: 'sale',
#           enforceKey: true,
#         persistentCheck,
#       )
#
# Need to fix to:
#       const existing = await idempotencyManager.executeIdempotentTransaction(
#         {
#           idempotencyKey,
#           businessId,
#           operationType: 'cancel_sale',
#           payload: { saleId, reason },
#           resourceType: 'sale',
#           enforceKey: true,
#         },
#         persistentCheck,
#         async () => {
#           // Return early if already completed
#           const freshSale = await this.getSale(saleId, businessId)
#           if (freshSale.cancellationStatus === this.CANCELLATION_STATUSES.COMPLETED) {
#             return { success: true, cancellationStatus: 'cancelled' }
#           }
#           if (freshSale.cancellationStatus === this.CANCELLATION_STATUSES.FAILED) {
#             return { success: false, cancellationStatus: 'cancel_failed', error: 'Previous cancellation failed; reconciliation required' }
#           }
#           return null
#         }
#       )

old_block = """      const existing = await idempotencyManager.executeIdempotentTransaction(
        {
          idempotencyKey,
          businessId,
          operationType: 'cancel_sale',
          payload: { saleId, reason },
          resourceType: 'sale',
          enforceKey: true,
        persistentCheck,
      )"""

new_block = """      const existing = await idempotencyManager.executeIdempotentTransaction(
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
      )"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/services/sale.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Block replaced')
else:
    print('FAIL: old block not found')
    # Debug: print lines 559-568
    lines = content.split('\n')
    for i in range(558, 570):
        if i < len(lines):
            print(f"{i+1}: {lines[i]}")