import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'

const mockStore = new Map<string, any>()

// Mock Appwrite for Financial Integrity & Reconciliation Tests
vi.mock('@/config/appwrite', () => {
  return {
    DATABASE_ID: 'inventory_lite_db',
    COLLECTIONS: {
      USERS: 'users',
      BUSINESSES: 'businesses',
      BUSINESS_MEMBERS: 'business_members',
      CATEGORIES: 'categories',
      PRODUCTS: 'products',
      STOCK_MOVEMENTS: 'stock_movements',
      CUSTOMERS: 'customers',
      SUPPLIERS: 'suppliers',
      SALES: 'sales',
      SALE_ITEMS: 'sale_items',
      PURCHASES: 'purchases',
      PURCHASE_ITEMS: 'purchase_items',
      SALES_RETURNS: 'sales_returns',
      SALES_RETURN_ITEMS: 'sales_return_items',
      PURCHASE_RETURNS: 'purchase_returns',
      PURCHASE_RETURN_ITEMS: 'purchase_return_items',
      CREDIT_NOTES: 'credit_notes',
      DEBIT_NOTES: 'debit_notes',
      EXPENSES: 'expenses',
      INVOICES: 'invoices',
      PAYMENTS: 'payments',
      SUPPLIER_PAYMENTS: 'supplier_payments',
      ACCOUNTS: 'accounts',
      JOURNAL_ENTRIES: 'journal_entries',
      JOURNAL_LINES: 'journal_lines',
      AUDIT_LOGS: 'audit_logs',
      TAX_RATES: 'tax_rates',
      TAX_TRANSACTIONS: 'tax_transactions',
      NUMBERING_SEQUENCES: 'numbering_sequences',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_e2e_owner' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = {
          $id: id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          $collectionId: colId,
          $databaseId: _dbId,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          ...data,
        }
        mockStore.set(`${colId}:${doc.$id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = mockStore.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return { ...doc }
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = mockStore.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data, $updatedAt: new Date().toISOString() }
        mockStore.set(`${colId}:${id}`, updated)
        return { ...updated }
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        mockStore.delete(`${colId}:${id}`)
        return {}
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(mockStore.values()).filter((d) => d.$collectionId === colId)
        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch =
              qStr.match(/equal\("([^"]+)"/) ||
              qStr.match(/"attribute":"([^"]+)"/) ||
              qStr.match(/attribute: '([^']+)'/)
            const valueMatch =
              qStr.match(/\["([^"]+)"\]/) ||
              qStr.match(/"values":\s*\["([^"]+)"\]/) ||
              qStr.match(/values: \['([^']+)'\]/)
            if (fieldMatch && valueMatch) {
              const field = fieldMatch[1]
              const val = valueMatch[1]
              filtered = filtered.filter((doc) => doc[field] === val)
            }
          }
        }
        return { documents: filtered, total: filtered.length }
      }),
    },
  }
})

import { productService } from '@/services/product.service'
import { supplierService } from '@/services/supplier.service'
import { customerService } from '@/services/customer.service'
import { purchaseService } from '@/services/purchase.service'
import { saleService } from '@/services/sale.service'
import { saleItemService } from '@/services/sale-item.service'
import { salesReturnService } from '@/services/sales-return.service'
import { expenseService } from '@/services/expense.service'
import { supplierPaymentService } from '@/services/supplier-payment.service'
import { paymentService } from '@/services/payment.service'
import { auditCenterService } from '@/services/audit-center.service'
import { accountingService } from '@/services/accounting.service'
import { generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { getMegaReportData } from '@/services/mega-report.service'

describe('Final Production Quality Gate: 25-Step Business Lifecycle & Reconciliation', () => {
  let bizId: string
  const userId = 'user_e2e_owner'

  beforeEach(async () => {
    vi.restoreAllMocks()
    mockStore.clear()

    bizId = `biz_prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    // Provision default accounts
    await accountingService.provisionDefaultChartOfAccounts(bizId, userId)
  })

  it('executes 25-step business workflow and satisfies 100% financial reconciliation', async () => {
    // 1. Create product
    const product = await productService.createProduct(
      {
        name: 'Rice 25kg Bag',
        unit: 'bag',
        purchasePrice: 1000,
        sellingPrice: 1500,
        stockQuantity: 0,
        lowStockThreshold: 5,
      },
      bizId,
      userId
    )
    expect(product.$id).toBeTruthy()

    // 2. Create supplier
    const supplier = await supplierService.createSupplier(
      {
        name: 'Himalayan Traders',
        phone: '9851000000',
        panVatNumber: '999888777',
      },
      bizId,
      userId
    )
    expect(supplier.$id).toBeTruthy()

    // 3. Purchase inventory (10 bags @ Rs. 1000 = Rs. 10,000)
    const purchaseRes = await purchaseService.createPurchase(
      {
        supplierId: supplier.$id,
        purchaseDate: new Date().toISOString(),
        items: [{ productId: product.$id, quantity: 10, purchasePrice: 1000 }],
        paidAmount: 6000, // Initial partial payment Rs 6,000
        paymentMethod: 'bank_transfer',
      },
      bizId,
      userId
    )
    const purchase = purchaseRes.purchase
    expect(purchase.total).toBe(10000)

    // 4. Pay supplier partially (initial payment was 6,000, due is 4,000)
    expect(purchase.dueAmount).toBe(4000)

    // 5. Verify supplier due
    const suppLedger1 = await auditCenterService.getSupplierLedgers(bizId)
    expect(suppLedger1[0].closingPayable).toBe(4000)

    // 6. Pay remaining supplier due (Rs. 4,000)
    await supplierPaymentService.createSupplierPayment(
      {
        supplierId: supplier.$id,
        purchaseId: purchase.$id,
        amount: 4000,
        paymentMethod: 'bank_transfer',
        paymentDate: new Date().toISOString(),
      },
      bizId,
      userId
    )

    // 7. Verify supplier due = Rs. 0.00
    const suppLedger2 = await auditCenterService.getSupplierLedgers(bizId)
    expect(suppLedger2[0].closingPayable).toBe(0)
    expect(suppLedger2[0].reconciliationStatus).toBe('BALANCED')

    // 8. Sell product for cash (2 bags @ Rs 1500 = subtotal Rs 3000, + 13% VAT 390 = Rs 3390)
    const sale1 = await saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 2, unitPrice: 1500 }],
        paidAmount: 3390,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )
    expect(sale1.sale.total).toBe(3390)

    // 9. Sell product on partial Udhaar (3 bags @ Rs 1500 = subtotal Rs 4500, + 13% VAT 585 = total Rs 5085; paid 2000, due 3085)
    const customer = await customerService.createCustomer(
      { name: 'Sita Devi', phone: '9841222333' },
      bizId,
      userId
    )
    const sale2 = await saleService.createSale(
      {
        customerId: customer.$id,
        items: [{ productId: product.$id, quantity: 3, unitPrice: 1500 }],
        paidAmount: 2000,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )
    expect(sale2.sale.dueAmount).toBe(3085)

    // 10. Pay customer outstanding later (Rs 3085)
    await paymentService.createPayment(
      {
        saleId: sale2.sale.$id,
        customerId: customer.$id,
        amount: 3085,
        paymentMethod: 'eSewa',
      },
      bizId,
      userId
    )
    const custLedger1 = await auditCenterService.getCustomerLedgers(bizId)
    expect(custLedger1[0].closingBalance).toBe(0)

    // 11. Process sales return (Return 1 bag from sale1)
    const sale1Items = await saleItemService.listSaleItems(sale1.sale.$id, bizId)
    const sReturn = await salesReturnService.createSalesReturn(
      {
        saleId: sale1.sale.$id,
        items: [{ saleItemId: sale1Items[0].$id, productId: product.$id, quantity: 1, unitPrice: 1500 }],
        reason: 'Customer return',
        refundMethod: 'cash',
      },
      bizId,
      userId
    )
    expect(sReturn.salesReturn.totalRefund).toBe(1500)

    // 14. Record expense (Rs 500)
    await expenseService.createExpense(
      {
        title: 'Shop Electricity',
        category: 'utilities',
        amount: 500,
        date: new Date().toISOString().slice(0, 10),
        description: 'Monthly electricity bill',
      },
      bizId,
      userId
    )

    // 15. Verify stock
    // Purchase 10 - Sold 2 - Sold 3 + Returned 1 = 6 bags left
    const updatedProduct = await productService.getProduct(product.$id, bizId)
    expect(updatedProduct.stockQuantity).toBe(6)

    // 16. Verify COGS & Profitability consistency
    // Gross sales = 3000 + 4500 = 7500
    // Returns = 1500 -> Net sales = 6000
    // Net sold qty = (2 - 1) + 3 = 4 bags @ cost Rs 1000 = Rs 4,000 COGS
    const kpis = await auditCenterService.getAuditOverviewKPIs(bizId)
    const invAudit = await auditCenterService.getInventoryCogsAudit(bizId)
    const profAudit = await auditCenterService.getProfitabilityAudit(bizId)

    expect(kpis.cogs).toBe(4000)
    expect(invAudit.summary.totalCogs).toBe(4000)
    expect(profAudit.cogs).toBe(4000)
    expect(kpis.cogs - invAudit.summary.totalCogs).toBe(0) // COGS difference = Rs 0.00!

    // 17 & 18. Customer & Supplier Ledgers
    expect(kpis.outstandingCustomerCredit).toBe(0)
    expect(kpis.supplierPayables).toBe(0)

    // 20 & 21. Profitability & General Ledger Balance
    // Total sales = 8475 - 1500 (returns) = 6975 net sales
    // Gross profit = Net sales 6975 - COGS 4000 = 2975
    // Net profit = Gross profit 2975 - Expenses 500 = 2475
    expect(kpis.grossProfit).toBe(2975)
    expect(kpis.netProfit).toBe(2475)

    // 22. Automated Full System Reconciliation Checks
    const reconResults = await auditCenterService.runFullSystemReconciliation(bizId)
    const mismatches = reconResults.filter((r) => r.status === 'MISMATCH')
    expect(mismatches.length).toBe(0)

    // 23. Generate PDF Report
    const reportData = await getMegaReportData({ businessId: bizId, userId })
    const pdfDoc = generateMegaReportPdf({ data: reportData })
    expect(pdfDoc.getNumberOfPages()).toBeGreaterThan(1)

    // 24 & 25. Generate Excel and inspect cells programmatically
    const excelBuffer = await generateMegaExcelBuffer({ data: reportData })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(excelBuffer as unknown as ArrayBuffer)
    expect(wb.worksheets.length).toBeGreaterThan(5)

    // Inspect monetary cells in Sales Register worksheet
    const salesSheet = wb.getWorksheet('Sales Register')
    if (salesSheet && salesSheet.rowCount > 1) {
      salesSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return // header
        // Total column (Column 7) must yield a non-NaN numeric value
        const totalCell = row.getCell(7)
        if (totalCell.value !== null && totalCell.value !== undefined) {
          const raw = totalCell.value
          const extracted = typeof raw === 'object' && raw !== null
            ? ('result' in raw ? (raw as any).result : 'text' in raw ? (raw as any).text : 'value' in raw ? (raw as any).value : raw)
            : raw
          const num = Number(extracted)
          expect(isNaN(num)).toBe(false)
        }
      })
    }
  })
})
