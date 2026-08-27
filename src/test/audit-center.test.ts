import { describe, it, expect, beforeEach, vi } from 'vitest'
import { auditCenterService } from '@/services/audit-center.service'
import { checkRolePermission } from '@/lib/authorization'
import { saleService } from '@/services/sale.service'
import { purchaseService } from '@/services/purchase.service'
import { customerService } from '@/services/customer.service'
import { supplierService } from '@/services/supplier.service'
import { productService } from '@/services/product.service'
import { expenseService } from '@/services/expense.service'
import { salesReturnService } from '@/services/sales-return.service'
import { stockMovementService } from '@/services/stock-movement.service'
import { businessService } from '@/services/business.service'

vi.mock('@/services/sale.service')
vi.mock('@/services/purchase.service')
vi.mock('@/services/customer.service')
vi.mock('@/services/supplier.service')
vi.mock('@/services/product.service')
vi.mock('@/services/expense.service')
vi.mock('@/services/sales-return.service')
vi.mock('@/services/stock-movement.service')
vi.mock('@/services/business.service')

describe('Audit & Compliance Center Tests', () => {
  const mockBusinessId = 'biz_test_audit_123'

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(saleService.listAllSales).mockResolvedValue([
      {
        $id: 'sale_1',
        businessId: mockBusinessId,
        invoiceNumber: 'INV-2081-001',
        total: 1130,
        taxableAmount: 1000,
        vatAmount: 130,
        paidAmount: 1130,
        status: 'completed',
        paymentStatus: 'PAID',
        createdAt: '2026-08-20T10:00:00Z',
      } as any,
      {
        $id: 'sale_2',
        businessId: mockBusinessId,
        invoiceNumber: 'INV-2081-002',
        total: 565,
        taxableAmount: 500,
        vatAmount: 65,
        paidAmount: 0,
        status: 'completed',
        paymentStatus: 'UNPAID',
        customerId: 'cust_1',
        customerName: 'Test Customer',
        createdAt: '2026-08-22T10:00:00Z',
      } as any,
    ])

    vi.mocked(purchaseService.listAllPurchases).mockResolvedValue([
      {
        $id: 'purch_1',
        businessId: mockBusinessId,
        billNumber: 'BILL-001',
        total: 565,
        taxableAmount: 500,
        vatAmount: 65,
        paidAmount: 565,
        createdAt: '2026-08-15T10:00:00Z',
      } as any,
    ])

    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValue([])
    vi.mocked(customerService.listAllCustomers).mockResolvedValue([
      {
        $id: 'cust_1',
        name: 'Test Customer',
        dueAmount: 565,
        creditLimit: 5000,
      } as any,
    ])
    vi.mocked(supplierService.listAllSuppliers).mockResolvedValue([])
    vi.mocked(productService.listAllProducts).mockResolvedValue([
      {
        $id: 'prod_1',
        name: 'Test Product',
        stockQuantity: 10,
        costPrice: 100,
      } as any,
    ])
    vi.mocked(expenseService.listAllExpenses).mockResolvedValue([])
    vi.mocked(stockMovementService.getMovementHistory).mockResolvedValue([])
    vi.mocked(businessService.getBusiness).mockResolvedValue({
      $id: mockBusinessId,
      name: 'Audit Business',
      panNumber: '123456789',
      vatNumber: '123456789',
    } as any)
  })

  it('1. Audit Overview KPIs computes correct sales, VAT and stock metrics', async () => {
    const kpis = await auditCenterService.getAuditOverviewKPIs(mockBusinessId)

    expect(kpis.totalSales).toBe(1695)
    expect(kpis.totalSalesCount).toBe(2)
    expect(kpis.outputVat).toBe(195)
    expect(kpis.inputVat).toBe(65)
    expect(kpis.netVatPosition).toBe(130)
    expect(kpis.stockValue).toBe(1000)
    expect(kpis.outstandingCustomerCredit).toBe(565)
  })

  it('2. Sales Register returns correct row list and summary totals', async () => {
    const register = await auditCenterService.getSalesRegister(mockBusinessId)

    expect(register.rows).toHaveLength(2)
    expect(register.summary.totalSales).toBe(1695)
    expect(register.summary.totalVat).toBe(195)
    expect(register.rows[0].invoiceNumber).toBe('INV-2081-001')
  })

  it('3. VAT Summary accurately computes 13% Output vs Input VAT position', async () => {
    const vat = await auditCenterService.getVatSummary(mockBusinessId)

    expect(vat.outputVat).toBe(195)
    expect(vat.inputVat).toBe(65)
    expect(vat.netVatPosition).toBe(130)
    expect(vat.vatRate).toBe(13)
  })

  it('4. IRD Readiness status defaults to NOT_CONFIGURED without false claims', async () => {
    const readiness = await auditCenterService.getIrdReadinessStatus(mockBusinessId)

    expect(readiness.cbmsIntegrationStatus).toBe('NOT_CONFIGURED')
    expect(readiness.approvalVerified).toBe(false)
    expect(readiness.electronicBillingStatus).toBe('Technical Readiness')
  })

  it('5. Invoice Sequence Audit detects duplicate invoice numbers', async () => {
    vi.mocked(saleService.listAllSales).mockResolvedValueOnce([
      { invoiceNumber: 'INV-001', fiscalYear: '2081/82', status: 'completed' } as any,
      { invoiceNumber: 'INV-001', fiscalYear: '2081/82', status: 'completed' } as any,
    ])

    const seq = await auditCenterService.getInvoiceSequenceAudit(mockBusinessId, '2081/82')

    expect(seq.isSequenceIntact).toBe(false)
    expect(seq.duplicatesDetected).toContain('INV-001')
  })

  it('6. Auditor Role RBAC permits read & export while restricting management', () => {
    expect(checkRolePermission('auditor', 'audit:view')).toBe(true)
    expect(checkRolePermission('auditor', 'audit:export')).toBe(true)
    expect(checkRolePermission('auditor', 'reports:view')).toBe(true)
    expect(checkRolePermission('auditor', 'products:manage')).toBe(false)
    expect(checkRolePermission('auditor', 'settings:manage')).toBe(false)
  })

  it('7. VAT output/input reads from vatAmount field on Sale and Purchase (regression)', async () => {
    vi.mocked(saleService.listAllSales).mockResolvedValueOnce([
      { $id: 'sale_vat_reg', total: 1130, vatAmount: 130, paidAmount: 1130, status: 'completed', createdAt: '2026-08-20T10:00:00Z' } as any,
    ])
    vi.mocked(purchaseService.listAllPurchases).mockResolvedValueOnce([
      { $id: 'purch_vat_reg', total: 565, vatAmount: 65, paidAmount: 565, createdAt: '2026-08-15T10:00:00Z' } as any,
    ])
    vi.mocked(salesReturnService.listAllSalesReturns).mockResolvedValueOnce([])

    const kpis = await auditCenterService.getAuditOverviewKPIs(mockBusinessId)

    expect(kpis.outputVat).toBe(130)
    expect(kpis.inputVat).toBe(65)
    expect(kpis.netVatPosition).toBe(65)
  })
})
