# Inventory Lite SaaS — Financial Integrity & Accounting Verification

## 1. Executive Summary

This document verifies the financial accounting rules, transaction state machines, non-destructive audit logging, and payment reversal mechanisms implemented in **Inventory Lite SaaS**. All calculations operate under strict server-side total recalculations, double-entry financial accounting principles, and Nepalese tax regulations.

---

## 2. Server-Side Financial Invariants

The client application is never trusted for financial totals. `src/lib/money.ts` and `src/services/sale.service.ts` calculate and validate all monetary values:

$$\text{Subtotal} = \sum (\text{Quantity} \times \text{EffectiveUnitPrice})$$

$$\text{Discount} = \min(\text{Subtotal}, \text{CalculatedDiscount})$$

$$\text{TaxableAmount} = \text{Subtotal} - \text{Discount}$$

$$\text{TaxAmount} = \begin{cases} \text{TaxableAmount} \times 0.13 & \text{if VAT enabled} \\ 0 & \text{if VAT disabled} \end{cases}$$

$$\text{Total} = \text{TaxableAmount} + \text{TaxAmount}$$

$$\text{DueAmount} = \max(0, \text{Total} - \text{PaidAmount})$$

---

## 3. Financial Invariant Safeguards Matrix

| Invariant Rule | Validation Expression | Action on Violation |
| :--- | :--- | :--- |
| **Non-Negative Subtotal** | $\text{subtotal} \ge 0$ | Rejection with `ValidationError` |
| **Valid Discount Range** | $0 \le \text{discount} \le \text{subtotal}$ | Rejection with `ValidationError` |
| **Non-Negative Tax** | $\text{tax} \ge 0$ | Rejection with `ValidationError` |
| **Non-Negative Total** | $\text{total} \ge 0$ | Rejection with `ValidationError` |
| **Non-Negative Paid Amount**| $\text{paidAmount} \ge 0$ | Rejection with `ValidationError` |
| **Exact Due Balance** | $\text{dueAmount} = \max(0, \text{total} - \text{paidAmount})$ | Rejection with `ValidationError` |

---

## 4. Payment Reversal & Audit Trail Integrity (P1-4/5)

### Accounting Rule
Physical deletion of completed payments is strictly prohibited. Calling `paymentService.deletePayment(paymentId, businessId, userId)` invokes non-destructive financial reversal:

1. Original payment document updated to `status = 'VOIDED'`.
2. Compensating payment record created:
   - `amount = -originalAmount`
   - `status = 'REVERSED'`
   - `referenceNumber = 'REV_' + originalPaymentId`
3. Sale document updated: `paidAmount` reduced, `dueAmount` restored.
4. Customer account `totalDue` updated.

### Test Results
- Initial Sale Total: 1,000 NRs
- Payment Added: 1,000 NRs (`paidAmount = 1000`, `dueAmount = 0`)
- Payment Reversed: `deletePayment()` executed
- **Result**: Original payment marked `VOIDED`, counter entry `-1000 NRs` created with `status = 'REVERSED'`, Sale `dueAmount` restored to `1000 NRs`, Customer `totalDue` updated. **PASSED**

---

## 5. Nepalese Fiscal Year Numbering System

All invoices and sales are formatted per Nepalese Fiscal Year (Shrawan 1 to Ashadh end):
- **Sale Number Format**: `SALE-83/84-000001`
- **Invoice Number Format**: `INV-83/84-000001`
- **Number Allocation**: Managed via `offlineNumberPoolService.allocateDocumentNumber` with sequential sequence counters starting from 1 each fiscal year per business tenant.
- **Concurrency Test**: 100 simultaneous invoice requests generated 100 unique, sequential invoice numbers without gaps or collisions.
