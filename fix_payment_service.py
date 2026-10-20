#!/usr/bin/env python3
import re

with open('src/services/payment.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_function = """  async reversePayment(
    paymentId: string,
    businessId: string,
    reversingUserId: string,
    reason: string = "Payment reversal",
    options?: { skipCustomerDueAdjustment?: boolean }
  ): Promise<Payment> {
    // Database-verified RBAC check: only owner or admin can reverse payment records
    await authorizeBusinessAccess({
      userId: reversingUserId,
      businessId,
      requiredRole: ["owner", "admin"],
    })

    const existingPayment = await this.getById<Payment>(paymentId, businessId)
    if (!existingPayment) {
      throw new Error("Payment record not found")
    }

    if (existingPayment.status === "VOIDED" || existingPayment.status === "REVERSED") {
      throw new Error("Payment record has already been reversed or voided")
    }

    const rawAmount = existingPayment.amount ?? 0
    if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount) || rawAmount < 0) {
      throw new Error('Invalid payment amount for reversal: ' + existingPayment.amount)
    }

    const amountPaisa = toMinorUnits(rawAmount)

    // If payment amount is zero (e.g. Full Udhaar record with no cash movement), just void the record
    if (amountPaisa === 0) {
      await this.update<Payment>(
        paymentId,
        {
          status: "VOIDED",
          notes: existingPayment.notes || "" + " [VOIDED by " + reversingUserId + ": " + reason + "]".trim(),
        },
        businessId
      )
      return { ...existingPayment, status: "VOIDED" } as Payment
    }

    // 1. Revert sale paid amount and update status
    if (existingPayment.saleId) {
      const sale = await saleService.getSale(existingPayment.saleId, businessId)
      if (sale) {
        const saleTotalP = toMinorUnits(sale.total)
        const newPaidP = Math.max(0, toMinorUnits(sale.paidAmount) - amountPaisa)
        const newDueP = Math.max(0, saleTotalP - newPaidP)
        const newStatus = newDueP > 0 ? "pending" : sale.status
        await saleService.update<Sale>(
          sale.$id,
          { paidAmount: fromMinorUnits(newPaidP), dueAmount: fromMinorUnits(newDueP), status: newStatus },
          businessId
        )
      }
    }

    // 2. Revert customer due balance (unless skipped, e.g. on full bill cancellation)
    if (existingPayment.customerId && !options?.skipCustomerDueAdjustment) {
      try {
        await customerService.updateDueAmount(
          existingPayment.customerId,
          fromMinorUnits(amountPaisa),
          businessId
        )
      } catch {
        // Ignore if customer profile document is missing
      }
    }

    // 3. Mark original payment record as VOIDED (non-destructive)
    await this.update<Payment>(
      paymentId,
      {
        status: "VOIDED",
        notes: existingPayment.notes || "" + " [VOIDED by " + reversingUserId + ": " + reason + "]".trim(),
      },
      businessId
    )

    // 4. Create an explicit compensating reversal payment document (-amount) in payment history
    const reversalDoc = await this.create<Payment>(
      {
        saleId: existingPayment.saleId,
        customerId: existingPayment.customerId || "",
        invoiceId: existingPayment.invoiceId || "",
        amount: -rawAmount,
        paymentMethod: existingPayment.paymentMethod,
        paymentDate: new Date().toISOString(),
        referenceNumber: "REV_" + existingPayment.$id,
        notes: "Reversal of Payment #" + existingPayment.$id + ": " + reason,
        status: "REVERSED",
        createdBy: reversingUserId,
      },
      businessId,
      reversingUserId
    )

    return reversalDoc
  }"""

new_function = """  async reversePayment(
    paymentId: string,
    businessId: string,
    reversingUserId: string,
    reason: string = "Payment reversal",
    options?: { skipCustomerDueAdjustment?: boolean }
  ): Promise<{ reversal: Payment; wasAlreadyReversed: boolean }> {
    // Database-verified RBAC check: only owner or admin can reverse payment records
    await authorizeBusinessAccess({
      userId: reversingUserId,
      businessId,
      requiredRole: ["owner", "admin"],
    })

    const existingPayment = await this.getById<Payment>(paymentId, businessId)
    if (!existingPayment) {
      throw new Error("Payment record not found")
    }

    // Idempotency check: if already VOIDED or REVERSED, return the existing reversal record
    if (existingPayment.status === "VOIDED" || existingPayment.status === "REVERSED") {
      // Return the existing reversal document; try to find it in the payment list
      const existingReversals = await this.listPayments(businessId, {
        saleId: existingPayment.saleId,
        customerId: existingPayment.customerId,
      })
      const reversal = existingReversals.find(
        (p) => p.referenceNumber?.startsWith("REV_" + paymentId) && (p.status === "REVERSED" || p.status === "VOIDED")
      )
      if (reversal) {
        return { reversal, wasAlreadyReversed: true }
      }
      // Fallback: return existing payment marked as VOIDED
      return { reversal: { ...existingPayment, status: "VOIDED" } as Payment, wasAlreadyReversed: true }
    }

    const rawAmount = existingPayment.amount ?? 0
    if (typeof rawAmount !== "number" || isNaN(rawAmount) || !isFinite(rawAmount) || rawAmount < 0) {
      throw new Error("Invalid payment amount for reversal: " + existingPayment.amount)
    }

    const amountPaisa = toMinorUnits(rawAmount)

    // If payment amount is zero (e.g. Full Udhaar record with no cash movement), just void the record
    if (amountPaisa === 0) {
      await this.update<Payment>(
        paymentId,
        {
          status: "VOIDED",
          notes: existingPayment.notes || "" + " [VOIDED by " + reversingUserId + ": " + reason + "]".trim(),
        },
        businessId
      )
      return { ...existingPayment, status: "VOIDED" } as Payment
    }

    // 1. Revert sale paid amount and update status
    if (existingPayment.saleId) {
      const sale = await saleService.getSale(existingPayment.saleId, businessId)
      if (sale) {
        const saleTotalP = toMinorUnits(sale.total)
        const newPaidP = Math.max(0, toMinorUnits(sale.paidAmount) - amountPaisa)
        const newDueP = Math.max(0, saleTotalP - newPaidP)
        const newStatus = newDueP > 0 ? "pending" : sale.status
        await saleService.update<Sale>(
          sale.$id,
          { paidAmount: fromMinorUnits(newPaidP), dueAmount: fromMinorUnits(newDueP), status: newStatus },
          businessId
        )
      }
    }

    // 2. Revert customer due balance (unless skipped, e.g. on full bill cancellation)
    if (existingPayment.customerId && !options?.skipCustomerDueAdjustment) {
      try {
        await customerService.updateDueAmount(
          existingPayment.customerId,
          fromMinorUnits(amountPaisa),
          businessId
        )
      } catch {
        // Ignore if customer profile document is missing; this is not fatal
      }
    }

    // 3. Mark original payment record as VOIDED (non-destructive)
    await this.update<Payment>(
      paymentId,
      {
        status: "VOIDED",
        notes: existingPayment.notes || "" + " [VOIDED by " + reversingUserId + ": " + reason + "]".trim(),
      },
      businessId
    )

    // 4. Create an explicit compensating reversal payment document (-amount) in payment history
    const reversalDoc = await this.create<Payment>(
      {
        saleId: existingPayment.saleId,
        customerId: existingPayment.customerId || "",
        invoiceId: existingPayment.invoiceId || "",
        amount: -rawAmount,
        paymentMethod: existingPayment.paymentMethod,
        paymentDate: new Date().toISOString(),
        referenceNumber: "REV_" + existingPayment.$id,
        notes: "Reversal of Payment #" + existingPayment.$id + ": " + reason,
        status: "REVERSED",
        createdBy: reversingUserId,
      },
      businessId,
      reversingUserId
    )

    return { reversal: reversalDoc, wasAlreadyReversed: false }
  }"""

if old_function in content:
    content = content.replace(old_function, new_function)
    with open('src/services/payment.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Function replaced')
else:
    print('FAIL: old_function not found in content')
    # Debug: find the reversePayment function location
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'async reversePayment' in line:
            print(f'Found at line {i+1}: {line}')
            for j in range(max(0,i-2), min(len(lines), i+15)):
                print(f'  {j+1}: {lines[j]}')
            break