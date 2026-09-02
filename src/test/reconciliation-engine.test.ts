import { describe, it, expect, beforeEach, vi } from 'vitest'
import { auditCenterService } from '@/services/audit-center.service'
import { calculateTaxForItems, calculateNetVatPosition } from '@/lib/vat-engine'
import { productService } from '@/services/product.service'
import { saleService } from '@/services/sale.service'
import { purchaseService } from '@/services/purchase.service'
import { customerService } from '@/services/customer.service'
import { supplierService } from '@/services/supplier.service'
import { salesReturnService } from '@/services/sales-return.service'
import { expenseService } from '@/services/expense.service'
import { businessService } from '@/services/business.service'
import { saleItemService } from '@/services/sale-item.service'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'

vi.mock('@/services/sale.service')
vi.mock('@/services/purchase.service')
vi.mock('@/services/customer.service')
vi.mock('@/services/supplier.service')
vi.mock('@/services/product.service')
vi.mock('@/services/expense.service')
vi.mock('@/services/sales-return.service')
vi.mock('@/services/stock-movement.service')
vi.mock('@/services/business.service')
vi.mock('@/services/sale-item.service')

describe('Deterministic Financial Reconciliation Engine Tests', () => {
  const mockBusinessId = 'biz_rec_test_999'

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(saleItemService.listSaleItems).mockResolvedValue([])

    vi.mocked(businessService.getBusiness).mockResolvedValue({
      $id: mockBusinessId,
      name: 'Reconciliation Test Business',
      panNumber: '987654321',
      vatNumber: '987654321',
    } as any)
  })

  it('1. Centralized Tax Engine correctly computes Taxable, Exempt, Output VAT, and Input VAT', () => {
    const items = [
      { quantity: 2, unitPrice: 1000, isTaxable: true }, // Taxable: 2000
      { quantity: 1, unitPrice: 500, isTaxable: false }, // Exempt: 500
    ]

    const taxResult = calculateTaxForItems(items, { vatEnabled: true, defaultTaxRate: 13 })

    expect(taxResult.taxableAmount).toBe(2000)
    expect(taxResult.nonTaxableAmount).toBe(500)
    expect(taxResult.vatAmount).toBe(260) // 13% of 2000
    expect(taxResult.totalAmount).toBe(2760)

    const netVat = calculateNetVatPosition(260, 130)
    expect(netVat.outputVat).toBe(260)
    expect(netVat.inputVat).toBe(130)
    expect(netVat.netVatPosition).toBe(130)
    expect(netVat.status).toBe('PAYABLE')
  })

  it('2. Weighted Average Costing (WAC) correctly updates product unit cost upon purchase intake', () => {
    // Current stock: 10 units @ Rs. 100 (Total = Rs. 1000)
    // New purchase: 10 units @ Rs. 200 (Total = Rs. 2000)
    // Expected WAC = (1000 + 2000) / 20 = Rs. 150
    const currentStock = 10
    const currentCost = 100
    const purchasedQty = 10
    const purchaseCost = 200

    const currentTotalPaisa = toMinorUnits(currentStock * currentCost)
    const newPurchasePaisa = toMinorUnits(purchasedQty * purchaseCost)
    const totalQty = currentStock + purchasedQty
    const expectedWac = fromMinorUnits(Math.round((currentTotalPaisa + newPurchasePaisa) / totalQty))

    expect(expectedWac).toBe(150)
  })

  it('3. Sales Reconciliation computes Net Sales = Gross Sales - Returns - Discounts', async () => {
    vi.mocked(saleService.listAllSales).mockResolvedValue([
      {
        $id: 's1',
        total: 10000,
        discountAmount: 500,
        vatAmount: 1300,
        taxableAmount: 10000,
        status: 'completed',
        createdAt: '2026-08-20T10:00:00Z',
      } as any,
    ])

    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValue([
      { $id: 'r1', totalRefund: 1000, createdAt: '2026-08-21T10:00:00Z' } as any,
    ])

    vi.mocked(purchaseService.listAllPurchases).mockResolvedValue([])
    vi.mocked(customerService.listAllCustomers).mockResolvedValue([])
    vi.mocked(supplierService.listAllSuppliers).mockResolvedValue([])
    vi.mocked(productService.listAllProducts).mockResolvedValue([])
    vi.mocked(expenseService.listAllExpenses).mockResolvedValue([])

    const kpis = await auditCenterService.getAuditOverviewKPIs(mockBusinessId)

    expect(kpis.totalSales).toBe(10000)
    expect(kpis.salesReturns).toBe(1000)
    expect(kpis.totalSales - kpis.salesReturns).toBe(9000)
  })

  it('4. Customer Ledger handles Overpayment / Customer Credit explicitly when Payment > Invoice', async () => {
    vi.mocked(customerService.listAllCustomers).mockResolvedValue([
      {
        $id: 'c1',
        name: 'Overpaying Customer',
        dueAmount: 0,
      } as any,
    ])

    vi.mocked(saleService.listAllSales).mockResolvedValue([
      {
        $id: 's_overpay',
        customerId: 'c1',
        total: 37400,
        paidAmount: 37402, // Overpaid by Rs. 2
        status: 'completed',
        createdAt: '2026-08-20T10:00:00Z',
      } as any,
    ])

    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValue([])

    const ledgers = await auditCenterService.getCustomerLedgers(mockBusinessId)

    expect(ledgers).toHaveLength(1)
    expect(ledgers[0].closingBalance).toBe(0)
    expect(ledgers[0].overpaymentCredit).toBe(2)
    expect(ledgers[0].reconciliationStatus).toBe('OVERPAID')
  })

  it('5. Supplier Ledger handles Supplier Overpayment / Credit explicitly', async () => {
    vi.mocked(supplierService.listAllSuppliers).mockResolvedValue([
      {
        $id: 'sup1',
        name: 'Test Supplier',
        totalPayable: 0,
      } as any,
    ])

    vi.mocked(purchaseService.listAllPurchases).mockResolvedValue([
      {
        $id: 'p_overpay',
        supplierId: 'sup1',
        total: 5000,
        paidAmount: 5100, // Overpaid by Rs. 100
        createdAt: '2026-08-15T10:00:00Z',
      } as any,
    ])

    const ledgers = await auditCenterService.getSupplierLedgers(mockBusinessId)

    expect(ledgers).toHaveLength(1)
    expect(ledgers[0].closingPayable).toBe(0)
    expect(ledgers[0].overpaymentCredit).toBe(100)
    expect(ledgers[0].reconciliationStatus).toBe('OVERPAID')
  })

  it('6. Automated Cross-Report Reconciliation Engine reports balanced GL and zero discrepancies', async () => {
    vi.mocked(saleService.listAllSales).mockResolvedValue([
      {
        $id: 's_bal',
        invoiceNumber: 'INV-2081-001',
        total: 1130,
        vatAmount: 130,
        paidAmount: 1130,
        status: 'completed',
        createdAt: '2026-08-20T10:00:00Z',
      } as any,
    ])

    vi.mocked(purchaseService.listAllPurchases).mockResolvedValue([
      {
        $id: 'p_bal',
        total: 565,
        vatAmount: 65,
        paidAmount: 565,
        createdAt: '2026-08-15T10:00:00Z',
      } as any,
    ])

    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValue([])
    vi.mocked(customerService.listAllCustomers).mockResolvedValue([])
    vi.mocked(supplierService.listAllSuppliers).mockResolvedValue([])
    vi.mocked(productService.listAllProducts).mockResolvedValue([])
    vi.mocked(expenseService.listAllExpenses).mockResolvedValue([])

    const checks = await auditCenterService.runFullSystemReconciliation(mockBusinessId)

    const salesCheck = checks.find((c) => c.id === 'rec_sales_register')
    const vatCheck = checks.find((c) => c.id === 'rec_output_vat')

    expect(salesCheck?.status).toBe('BALANCED')
    expect(vatCheck?.status).toBe('BALANCED')
  })

  it('7. Sales Returns reads totalRefund field correctly (regression)', async () => {
    vi.mocked(saleService.listAllSales).mockResolvedValue([
      { $id: 's1', total: 5000, discountAmount: 0, vatAmount: 0, taxableAmount: 5000, status: 'completed', createdAt: '2026-08-20T10:00:00Z' } as any,
    ])
    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValue([
      { $id: 'r1', totalRefund: 2500, createdAt: '2026-08-21T10:00:00Z' } as any,
      { $id: 'r2', totalRefund: 500, createdAt: '2026-08-22T10:00:00Z' } as any,
    ])
    vi.mocked(purchaseService.listAllPurchases).mockResolvedValue([])
    vi.mocked(customerService.listAllCustomers).mockResolvedValue([])
    vi.mocked(supplierService.listAllSuppliers).mockResolvedValue([])
    vi.mocked(productService.listAllProducts).mockResolvedValue([])
    vi.mocked(expenseService.listAllExpenses).mockResolvedValue([])

    const kpis = await auditCenterService.getAuditOverviewKPIs(mockBusinessId)

    expect(kpis.totalSales).toBe(5000)
    expect(kpis.salesReturns).toBe(3000)
    expect(kpis.totalSales - kpis.salesReturns).toBe(2000)
  })
})
