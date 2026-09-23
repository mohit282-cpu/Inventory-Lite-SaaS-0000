"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Customer } from '@/types'

// Dynamic Dialog Imports for Bundle Optimization
const CustomerFormDialog = dynamic(
  () => import('@/components/features/customers/customer-form-dialog').then((mod) => mod.CustomerFormDialog),
  { ssr: false }
)

const CustomerDetailsDialog = dynamic(
  () => import('@/components/features/customers/customer-details-dialog').then((mod) => mod.CustomerDetailsDialog),
  { ssr: false }
)

type SortColumn = 'name' | 'totalDue'
type SortDirection = 'asc' | 'desc'

export default function CustomersPage() {
  const { activeBusiness, user, isAuthLoading, isWorkspaceLoading } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Sorting & Pagination State
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!activeBusiness?.$id) {
      if (!isAuthLoading && !isWorkspaceLoading) {
        setIsLoading(false)
      }
      return
    }
    const bId = activeBusiness.$id

    try {
      setIsLoading(true)
      setIsError(false)
      setErrorMessage('')
      const data = await customerService.listCustomers(bId)
      setCustomers(data || [])
    } catch (err: any) {
      const errRef = logger.error('Failed to load customer directory', err, {
        category: 'APPWRITE',
        path: '/app/customers',
        businessId: bId,
      })
      setIsError(true)
      setErrorMessage(err.message || 'Failed to fetch customer records.')
      toast({
        title: 'Error loading customers',
        description: `${err.message || 'Failed to load customers.'} (Ref: ${errRef})`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, isAuthLoading, isWorkspaceLoading, toast])

  // Reset search, sorting, pagination state when active business switches
  useEffect(() => {
    setCustomers([])
    setCurrentPage(1)
    setSearchQuery('')
    fetchCustomers()
  }, [fetchCustomers])

  // Reset pagination to page 1 on search or items per page change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, itemsPerPage])

  const currency = activeBusiness?.currency || 'NPR'

  // Handle Sort Toggle
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  // Clear search filter handler
  const handleClearSearch = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const isFilterActive = searchQuery.trim() !== ''

  // Memoized Search & Sorting Evaluation
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers]

    // 1. Search Filter (Multi-field: Name, Phone, Email, Address, PAN)
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.panNumber && c.panNumber.toLowerCase().includes(q))
      )
    }

    // 2. Sorting Evaluation
    result.sort((a, b) => {
      if (sortColumn === 'name') {
        const valA = (a.name || '').toLowerCase()
        const valB = (b.name || '').toLowerCase()
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      }

      if (sortColumn === 'totalDue') {
        const dueA = a.totalDue ?? a.dueAmount ?? 0
        const dueB = b.totalDue ?? b.dueAmount ?? 0
        if (dueA < dueB) return sortDirection === 'asc' ? -1 : 1
        if (dueA > dueB) return sortDirection === 'asc' ? 1 : -1
        return 0
      }

      return 0
    })

    return result
  }, [debouncedSearchQuery, customers, sortColumn, sortDirection])

  // Pagination Calculations
  const totalItems = filteredAndSortedCustomers.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const validPage = Math.min(Math.max(1, currentPage), totalPages)
  
  const startIndex = (validPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedCustomers = filteredAndSortedCustomers.slice(startIndex, endIndex)

  const handleCreateOrUpdate = async (data: {
    name: string
    phone?: string
    email?: string
    address?: string
    panNumber?: string
  }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)

    try {
      if (selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.$id, data, activeBusiness.$id)
        toast({
          title: 'Customer Updated',
          description: `Customer "${data.name}" details updated.`,
        })
      } else {
        await customerService.createCustomer(data, activeBusiness.$id, user.$id)
        toast({
          title: 'Customer Created',
          description: `Customer "${data.name}" added to business directory.`,
        })
      }
      await fetchCustomers()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!customerToDelete || !activeBusiness?.$id) return

    const due = Math.max(customerToDelete.totalDue || 0, customerToDelete.dueAmount || 0)
    if (due > 0) {
      toast({
        title: 'Cannot Delete Customer',
        description: `Customer "${customerToDelete.name}" has an outstanding balance due of ${formatCurrency(due, currency)}. Please settle all pending dues before deleting.`,
        variant: 'destructive',
      })
      setIsDeleteOpen(false)
      setCustomerToDelete(null)
      return
    }

    setIsSubmitting(true)

    try {
      await customerService.deleteCustomer(customerToDelete.$id, activeBusiness.$id)
      toast({
        title: 'Customer Removed',
        description: `Customer "${customerToDelete.name}" was removed.`,
      })
      await fetchCustomers()
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to remove customer.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteOpen(false)
      setCustomerToDelete(null)
    }
  }

  // Column definitions with accessible headers, numeric sorting, and muted N/A styling
  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: (
        <button
          type="button"
          onClick={() => handleSort('name')}
          className="flex items-center gap-1.5 font-extrabold text-slate-700 hover:text-slate-900 focus:outline-none"
        >
          <span>Customer Name</span>
          {sortColumn === 'name' ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
          )}
        </button>
      ),
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
          <div className="text-xs mt-0.5">
            <span className="text-slate-500 font-medium">PAN: </span>
            {item.panNumber && item.panNumber.trim() !== '' ? (
              <span className="font-mono font-semibold text-slate-700">{item.panNumber}</span>
            ) : (
              <span className="font-mono text-slate-400 font-normal">N/A</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (item) => (
        item.phone && item.phone.trim() !== '' ? (
          <span className="font-mono text-slate-700 font-medium text-xs sm:text-sm">{item.phone}</span>
        ) : (
          <span className="font-mono text-slate-400 font-normal text-xs sm:text-sm">N/A</span>
        )
      ),
    },
    {
      key: 'email',
      header: 'Email Address',
      render: (item) => (
        item.email && item.email.trim() !== '' ? (
          <span className="text-slate-600 text-xs sm:text-sm">{item.email}</span>
        ) : (
          <span className="text-slate-400 font-normal text-xs sm:text-sm">N/A</span>
        )
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (item) => (
        item.address && item.address.trim() !== '' ? (
          <span className="text-slate-600 text-xs sm:text-sm">{item.address}</span>
        ) : (
          <span className="text-slate-400 font-normal text-xs sm:text-sm">N/A</span>
        )
      ),
    },
    {
      key: 'totalDue',
      header: (
        <button
          type="button"
          onClick={() => handleSort('totalDue')}
          className="flex items-center gap-1.5 font-extrabold text-slate-700 hover:text-slate-900 focus:outline-none"
        >
          <span>Balance Due</span>
          {sortColumn === 'totalDue' ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
          )}
        </button>
      ),
      sortable: true,
      render: (item) => {
        const due = item.totalDue ?? item.dueAmount ?? 0

        // Case 1: Outstanding Balance Due (> 0) -> Amber warning
        if (due > 0) {
          return (
            <Link
              href={`/app/credit?customerId=${item.$id}`}
              className="inline-flex items-center gap-1 font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs sm:text-sm hover:bg-amber-100 transition-colors"
              title="Click to manage credit ledger for this customer"
            >
              <span>{formatCurrency(due, currency)}</span>
              <span className="text-[10px] font-sans font-semibold uppercase text-amber-700">(Due)</span>
            </Link>
          )
        }

        // Case 2: Advance Credit (< 0) -> Emerald credit state
        if (due < 0) {
          return (
            <span
              className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs sm:text-sm"
              title="Customer has an advance credit balance"
            >
              <span>-{formatCurrency(Math.abs(due), currency)}</span>
              <span className="text-[10px] font-sans font-semibold uppercase text-emerald-700">(Credit)</span>
            </span>
          )
        }

        // Case 3: Zero Balance (= 0) -> Slate neutral state
        return (
          <span className="font-mono font-semibold text-slate-700 text-xs sm:text-sm">
            {formatCurrency(0, currency)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDetailsCustomer(item)
              setIsDetailsOpen(true)
            }}
            title="View Customer Details & Ledger"
            aria-label={`View details for ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCustomer(item)
              setIsFormOpen(true)
            }}
            title="Edit Customer Info"
            aria-label={`Edit ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCustomerToDelete(item)
              setIsDeleteOpen(true)
            }}
            title="Delete Customer"
            aria-label={`Delete ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Page Header */}
      <PageHeader
        title="Customer Directory"
        description={`Manage customer contacts, credit ledger balances, and purchase history for ${activeBusiness?.name || 'your store'}.`}
        actions={
          <Button
            onClick={() => {
              setSelectedCustomer(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      {/* 2. Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search customers by name, phone, email, address, or PAN..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md bg-white border-slate-300"
        />

        {isFilterActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            className="h-9 px-3 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50 self-end sm:self-auto"
          >
            <X className="mr-1.5 h-3.5 w-3.5" /> Clear Search
          </Button>
        )}
      </div>

      {/* 3. Result Summary Header */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
          <div>
            Showing <span className="font-bold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</span> of{' '}
            <span className="font-bold text-slate-900">{customers.length}</span> registered customers
            {isFilterActive && <span className="text-indigo-600 font-semibold ml-1">(filtered)</span>}
          </div>
          {totalPages > 1 && (
            <div>
              Page <span className="font-bold text-slate-900">{validPage}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Error State Banner */}
      {isError && (
        <div className="p-8 text-center border border-rose-200 rounded-xl bg-white shadow-xs space-y-3 max-w-md mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load customers</h3>
          <p className="text-xs text-slate-500">{errorMessage || 'An error occurred while fetching customer records.'}</p>
          <Button onClick={fetchCustomers} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Loading
          </Button>
        </div>
      )}

      {/* 5. Main Table & Mobile Cards View */}
      {!isError && (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            {customers.length === 0 && !isLoading ? (
              /* State A: Business has NO customers total */
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No customers yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your first customer to start tracking contacts, credit ledger, and sales invoices.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setIsFormOpen(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 shadow-xs"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Customer
                </Button>
              </div>
            ) : filteredAndSortedCustomers.length === 0 && !isLoading ? (
              /* State B: Search returns 0 customers */
              <div className="p-12 text-center border border-slate-200 rounded-xl bg-white space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Filter className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No customers found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No customers matched your search query. Try searching by another name, phone number, email, address, or PAN.
                  </p>
                </div>
                <Button variant="outline" onClick={handleClearSearch} className="h-9 px-4 text-xs font-bold border-slate-300">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear Search
                </Button>
              </div>
            ) : (
              <DataTable
                data={paginatedCustomers}
                columns={columns}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="h-4 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded" />
                  </div>
                </div>
              ))
            ) : customers.length === 0 ? (
              /* State A Mobile */
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <Users className="h-8 w-8 mx-auto text-indigo-600 opacity-80" />
                <h3 className="text-sm font-bold text-slate-900">No customers yet</h3>
                <p className="text-xs text-slate-500">Add your first customer to start tracking contacts and credit history.</p>
                <Button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setIsFormOpen(true)
                  }}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Customer
                </Button>
              </div>
            ) : filteredAndSortedCustomers.length === 0 ? (
              /* State B Mobile */
              <div className="p-8 text-center border border-slate-200 rounded-xl bg-white space-y-3">
                <Filter className="h-8 w-8 mx-auto text-amber-600 opacity-80" />
                <h3 className="text-sm font-bold text-slate-900">No customers found</h3>
                <p className="text-xs text-slate-500">No customers matched your search query.</p>
                <Button variant="outline" size="sm" onClick={handleClearSearch} className="text-xs font-bold">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear Search
                </Button>
              </div>
            ) : (
              paginatedCustomers.map((c) => {
                const due = c.totalDue ?? c.dueAmount ?? 0

                return (
                  <div key={c.$id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{c.name}</h4>
                        <div className="text-xs mt-0.5">
                          <span className="text-slate-500">PAN: </span>
                          {c.panNumber && c.panNumber.trim() !== '' ? (
                            <span className="font-mono font-semibold text-slate-700">{c.panNumber}</span>
                          ) : (
                            <span className="font-mono text-slate-400 font-normal">N/A</span>
                          )}
                        </div>
                      </div>

                      {/* Balance Due Badge */}
                      <div className="shrink-0">
                        {due > 0 ? (
                          <Link
                            href={`/app/credit?customerId=${c.$id}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs"
                          >
                            <span>{formatCurrency(due, currency)}</span>
                            <span className="text-[9px] font-sans font-semibold uppercase text-amber-700">(Due)</span>
                          </Link>
                        ) : due < 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            <span>-{formatCurrency(Math.abs(due), currency)}</span>
                            <span className="text-[9px] font-sans font-semibold uppercase text-emerald-700">(Credit)</span>
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-slate-700 text-xs">
                            {formatCurrency(0, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone</span>
                        <span className="font-mono font-medium text-slate-800">
                          {c.phone && c.phone.trim() !== '' ? c.phone : <span className="text-slate-400 font-normal">N/A</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Email</span>
                        <span className="text-slate-800 truncate block">
                          {c.email && c.email.trim() !== '' ? c.email : <span className="text-slate-400 font-normal">N/A</span>}
                        </span>
                      </div>
                    </div>

                    {/* Touch Accessible Action Buttons (min-h 44px) */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailsCustomer(c)
                          setIsDetailsOpen(true)
                        }}
                        aria-label={`View details for ${c.name}`}
                        className="h-10 text-xs font-bold border-slate-200 text-slate-700"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setIsFormOpen(true)
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="h-10 text-xs font-bold border-slate-200 text-indigo-600"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomerToDelete(c)
                          setIsDeleteOpen(true)
                        }}
                        aria-label={`Delete ${c.name}`}
                        className="h-10 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 6. Pagination Controls */}
          {totalPages > 1 && !isLoading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Per Page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="h-8 w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Items per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validPage === 1}
                  className="h-9 px-3 text-xs font-bold border-slate-300 disabled:opacity-50"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - validPage) <= 1) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                            validPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 && validPage > 3) {
                      return <span key="ellipsis-start" className="text-slate-400 px-1 text-xs">...</span>
                    }
                    if (pageNum === totalPages - 1 && validPage < totalPages - 2) {
                      return <span key="ellipsis-end" className="text-slate-400 px-1 text-xs">...</span>
                    }
                    return null
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validPage === totalPages}
                  className="h-9 px-3 text-xs font-bold border-slate-300 disabled:opacity-50"
                  aria-label="Next Page"
                >
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Form Modal */}
      <CustomerFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedCustomer(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedCustomer}
        isLoading={isSubmitting}
      />

      {/* Customer Details Modal */}
      <CustomerDetailsDialog
        customer={detailsCustomer}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setDetailsCustomer(null)
        }}
      />

      {/* Protected Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Customer Record"
        description={
          (customerToDelete?.totalDue || customerToDelete?.dueAmount || 0) > 0
            ? `Cannot delete customer "${customerToDelete?.name}" because they have an outstanding balance due of ${formatCurrency(
                customerToDelete?.totalDue || customerToDelete?.dueAmount || 0,
                currency
              )}. Please settle all pending dues before deleting.`
            : `Are you sure you want to remove "${customerToDelete?.name}" from your customer directory?`
        }
        confirmText="Delete Customer"
        isLoading={isSubmitting}
      />
    </div>
  )
}
