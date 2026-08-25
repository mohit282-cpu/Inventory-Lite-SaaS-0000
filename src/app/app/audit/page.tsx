"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { AuditFilterBar } from '@/components/features/audit/AuditFilterBar'
import { AuditorDrillDownDrawer } from '@/components/features/audit/AuditorDrillDownDrawer'
import { AuditOverviewTab } from '@/components/features/audit/AuditOverviewTab'
import { SalesRegisterTab } from '@/components/features/audit/SalesRegisterTab'
import { PurchaseRegisterTab } from '@/components/features/audit/PurchaseRegisterTab'
import { VatSummaryTab } from '@/components/features/audit/VatSummaryTab'
import { CustomerLedgerTab } from '@/components/features/audit/CustomerLedgerTab'
import { SupplierLedgerTab } from '@/components/features/audit/SupplierLedgerTab'
import { PaymentAuditTab } from '@/components/features/audit/PaymentAuditTab'
import { InventoryCogsTab } from '@/components/features/audit/InventoryCogsTab'
import { ProfitabilityTab } from '@/components/features/audit/ProfitabilityTab'
import { ReturnsAdjustmentsTab } from '@/components/features/audit/ReturnsAdjustmentsTab'
import { CancelledDocumentsTab } from '@/components/features/audit/CancelledDocumentsTab'
import { AuditTrailTab } from '@/components/features/audit/AuditTrailTab'
import { InvoiceSequenceTab } from '@/components/features/audit/InvoiceSequenceTab'
import { IrdReadinessTab } from '@/components/features/audit/IrdReadinessTab'
import { ReconciliationTab } from '@/components/features/audit/ReconciliationTab'
import { ExportCenterTab } from '@/components/features/audit/ExportCenterTab'

import {
  auditCenterService,
  AuditOverviewKPIs,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  PaymentAuditRecord,
  ReturnsAdjustmentsRecord,
  CancelledDocumentRecord,
  ProfitabilityAuditSummary,
} from '@/services/audit-center.service'
import { customerService } from '@/services/customer.service'
import { supplierService } from '@/services/supplier.service'
import {
  AuditFilterParams,
  IrdReadinessStatus,
  IrdReconciliationItem,
  InvoiceSequenceAudit,
} from '@/types'
import { AuditLogEntry } from '@/services/audit-log.service'
import {
  ShieldCheck,
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Percent,
  Building2,
  CreditCard,
  Wallet,
  Boxes,
  TrendingUp,
  RotateCcw,
  XCircle,
  FileText,
  FileCheck2,
  Download,
  Lock,
  Eye,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = 'owner' | 'accountant' | 'auditor'

export default function AuditCenterPage() {
  const { activeBusiness, memberships } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('accountant')
  const [activeTab, setActiveTab] = useState<string>('overview')

  const [filters, setFilters] = useState<AuditFilterParams>({})
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Data States
  const [kpis, setKpis] = useState<AuditOverviewKPIs | null>(null)
  const [salesData, setSalesData] = useState<any>(null)
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [vatData, setVatData] = useState<any>(null)
  const [customerLedgers, setCustomerLedgers] = useState<CustomerLedgerEntry[]>([])
  const [supplierLedgers, setSupplierLedgers] = useState<SupplierLedgerEntry[]>([])
  const [payments, setPayments] = useState<PaymentAuditRecord[]>([])
  const [inventoryAudit, setInventoryAudit] = useState<any>(null)
  const [profitability, setProfitability] = useState<ProfitabilityAuditSummary | null>(null)
  const [returns, setReturns] = useState<ReturnsAdjustmentsRecord[]>([])
  const [cancelledDocs, setCancelledDocs] = useState<CancelledDocumentRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [sequenceAudit, setSequenceAudit] = useState<InvoiceSequenceAudit | null>(null)
  const [irdStatus, setIrdStatus] = useState<IrdReadinessStatus | null>(null)
  const [reconciliation, setReconciliation] = useState<IrdReconciliationItem[]>([])
  const [reconciliationChecks, setReconciliationChecks] = useState<any[]>([])

  // Drill Down State
  const [drillDownItem, setDrillDownItem] = useState<{
    type: 'invoice' | 'payment' | 'vat' | 'stock' | 'customer' | 'supplier'
    title: string
    referenceId: string
    details: Record<string, any>
  } | null>(null)

  // Determine user role permission
  const currentRole = memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'
  const isAuditorMode = viewMode === 'auditor' || currentRole === 'auditor'

  // Fetch filter dropdown options
  useEffect(() => {
    if (!activeBusiness?.$id) return
    const bId = activeBusiness.$id
    Promise.all([customerService.listAllCustomers(bId), supplierService.listAllSuppliers(bId)])
      .then(([cList, sList]) => {
        setCustomers(cList.map((c) => ({ id: c.$id, name: c.name })))
        setSuppliers(sList.map((s) => ({ id: s.$id, name: s.name })))
      })
      .catch(() => {})
  }, [activeBusiness?.$id])

  // Primary Audit Data Fetcher
  const loadAuditData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      setError(null)
      const bId = activeBusiness.$id

      const [
        kpiRes,
        sRes,
        pRes,
        vRes,
        cLres,
        sLres,
        payRes,
        invRes,
        profRes,
        retRes,
        canRes,
        logRes,
        seqRes,
        irdRes,
        recRes,
        checksRes,
      ] = await Promise.all([
        auditCenterService.getAuditOverviewKPIs(bId, filters),
        auditCenterService.getSalesRegister(bId, filters),
        auditCenterService.getPurchaseRegister(bId, filters),
        auditCenterService.getVatSummary(bId, filters),
        auditCenterService.getCustomerLedgers(bId, filters),
        auditCenterService.getSupplierLedgers(bId, filters),
        auditCenterService.getPaymentAudit(bId, filters),
        auditCenterService.getInventoryCogsAudit(bId, filters),
        auditCenterService.getProfitabilityAudit(bId, filters),
        auditCenterService.getReturnsAdjustmentsAudit(bId, filters),
        auditCenterService.getCancelledDocuments(bId, filters),
        auditCenterService.getAuditTrail(bId, filters),
        auditCenterService.getInvoiceSequenceAudit(bId, filters.fiscalYear),
        auditCenterService.getIrdReadinessStatus(bId),
        auditCenterService.getIrdReconciliation(bId, filters),
        auditCenterService.runFullSystemReconciliation(bId, filters),
      ])

      setKpis(kpiRes)
      setSalesData(sRes)
      setPurchaseData(pRes)
      setVatData(vRes)
      setCustomerLedgers(cLres)
      setSupplierLedgers(sLres)
      setPayments(payRes)
      setInventoryAudit(invRes)
      setProfitability(profRes)
      setReturns(retRes)
      setCancelledDocs(canRes)
      setAuditLogs(logRes)
      setSequenceAudit(seqRes)
      setIrdStatus(irdRes)
      setReconciliation(recRes)
      setReconciliationChecks(checksRes)
    } catch (err: any) {
      console.error('Audit Center Data Load Error:', err)
      setError(err.message || 'Failed to load audit records.')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id, filters])

  useEffect(() => {
    loadAuditData()
  }, [loadAuditData])

  const handleDrillDown = (title: string, refId: string, details: Record<string, any>) => {
    setDrillDownItem({
      type: 'invoice',
      title,
      referenceId: refId,
      details,
    })
  }

  const tabsList = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales Register', icon: ShoppingCart },
    { id: 'purchases', label: 'Purchase Register', icon: ShoppingBag },
    { id: 'vat', label: 'VAT / Tax Summary', icon: Percent },
    { id: 'customers', label: 'Customer Ledger', icon: Building2 },
    { id: 'suppliers', label: 'Supplier Ledger', icon: CreditCard },
    { id: 'payments', label: 'Payment Audit', icon: Wallet },
    { id: 'inventory', label: 'Inventory & COGS', icon: Boxes },
    { id: 'profitability', label: 'Profitability', icon: TrendingUp },
    { id: 'returns', label: 'Returns & Adjustments', icon: RotateCcw },
    { id: 'cancelled', label: 'Cancelled Docs', icon: XCircle },
    { id: 'audit-trail', label: 'Audit Trail', icon: FileText },
    { id: 'sequence', label: 'Sequence Audit', icon: ShieldCheck },
    { id: 'ird', label: 'IRD Readiness', icon: ShieldCheck },
    { id: 'reconciliation', label: 'Reconciliation', icon: FileCheck2 },
    { id: 'export', label: 'Export Center', icon: Download },
  ]

  if (error) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 shadow-xs text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h3 className="font-extrabold text-base text-slate-900">Unable to load Audit & Compliance Center</h3>
        <p className="text-xs text-slate-600">{error}</p>
        <Button onClick={loadAuditData} className="gap-2 bg-slate-900 text-white font-bold text-xs">
          <RefreshCw className="h-4 w-4" /> Retry Audit Load
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <PageHeader
            title="Audit & Compliance Center"
            description="Complete financial visibility, registers, tax ledgers, and transaction-level audit evidence."
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Auditor Mode Read-Only Tag */}
          {isAuditorMode && (
            <div className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <Lock className="h-3.5 w-3.5 text-amber-700" />
              <span>Auditor Mode (Read-Only)</span>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('owner')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'owner' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Owner View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('accountant')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'accountant' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" /> Accountant View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('auditor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'auditor' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Auditor View
            </button>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <AuditFilterBar
        filters={filters}
        onFilterChange={(f) => setFilters(f)}
        onReset={() => setFilters({})}
        customers={customers}
        suppliers={suppliers}
      />

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 min-w-max pb-1">
          {tabsList.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Render Selected Tab */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <AuditOverviewTab
            kpis={kpis}
            loading={loading}
            onSelectTab={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'sales' && (
          <SalesRegisterTab data={salesData} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'purchases' && (
          <PurchaseRegisterTab data={purchaseData} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'vat' && <VatSummaryTab data={vatData} loading={loading} />}

        {activeTab === 'customers' && (
          <CustomerLedgerTab ledgers={customerLedgers} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'suppliers' && (
          <SupplierLedgerTab ledgers={supplierLedgers} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'payments' && (
          <PaymentAuditTab payments={payments} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'inventory' && (
          <InventoryCogsTab data={inventoryAudit} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'profitability' && (
          <ProfitabilityTab summary={profitability} loading={loading} />
        )}

        {activeTab === 'returns' && (
          <ReturnsAdjustmentsTab records={returns} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'cancelled' && (
          <CancelledDocumentsTab cancelled={cancelledDocs} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailTab logs={auditLogs} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'sequence' && <InvoiceSequenceTab audit={sequenceAudit} loading={loading} />}

        {activeTab === 'ird' && <IrdReadinessTab status={irdStatus} loading={loading} />}

        {activeTab === 'reconciliation' && (
          <ReconciliationTab items={reconciliation} checks={reconciliationChecks} loading={loading} onDrillDown={handleDrillDown} />
        )}

        {activeTab === 'export' && (
          <ExportCenterTab
            businessName={activeBusiness?.name || 'My Business'}
            panNumber={activeBusiness?.panNumber || activeBusiness?.vatNumber || 'N/A'}
            fiscalYear={filters.fiscalYear || '2081/82'}
            salesData={salesData}
            purchaseData={purchaseData}
            vatData={vatData}
            customerData={customerLedgers}
            supplierData={supplierLedgers}
          />
        )}
      </div>

      {/* Multi-Level Evidence Drill Down Drawer */}
      <AuditorDrillDownDrawer item={drillDownItem} onClose={() => setDrillDownItem(null)} />
    </div>
  )
}
