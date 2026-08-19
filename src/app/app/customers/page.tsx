"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CustomerFormDialog } from '@/components/features/customers/customer-form-dialog'
import { CustomerDetailsDialog } from '@/components/features/customers/customer-details-dialog'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { Customer } from '@/types'

export default function CustomersPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const data = await customerService.listCustomers(activeBusiness.$id)
      setCustomers(data)
      setFilteredCustomers(data)
    } catch (err: any) {
      toast({
        title: 'Error loading customers',
        description: err.message || 'Failed to fetch customer records.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q))
        )
      )
    }
  }, [searchQuery, customers])

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
      setCustomerToDelete(null)
    }
  }

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      sortable: true,
      width: '18%',
      align: 'left',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-800 text-sm sm:text-base">{item.name}</div>
          {item.panNumber && <div className="text-xs text-slate-500 font-mono mt-0.5">PAN: {item.panNumber}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      width: '16%',
      align: 'left',
      render: (item) => <span className="font-mono text-slate-700 font-medium text-xs sm:text-sm">{item.phone || 'N/A'}</span>,
    },
    {
      key: 'email',
      header: 'Email Address',
      width: '20%',
      align: 'left',
      render: (item) => <span className="text-slate-600 text-xs sm:text-sm">{item.email || 'N/A'}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      width: '20%',
      align: 'left',
      render: (item) => <span className="text-slate-600 text-xs sm:text-sm">{item.address || 'N/A'}</span>,
    },
    {
      key: 'totalDue',
      header: 'Balance Due',
      sortable: true,
      width: '14%',
      align: 'right',
      render: (item) => {
        const due = item.totalDue || 0
        if (due > 0) {
          return (
            <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs sm:text-sm inline-block">
              Rs. {due.toFixed(2)}
            </span>
          )
        }
        return (
          <span className="font-mono font-semibold text-slate-800 text-xs sm:text-sm">
            Rs. 0.00
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '12%',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDetailsCustomer(item)
              setIsDetailsOpen(true)
            }}
            className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-600 rounded-lg"
            title="View Customer Details & Ledger"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCustomer(item)
              setIsFormOpen(true)
            }}
            className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-600 rounded-lg"
            title="Edit Customer Info"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomerToDelete(item)
              setIsDeleteOpen(true)
            }}
            className="h-9 w-9 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-600 rounded-lg"
            title="Delete Customer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Customer Directory"
        description="Maintain customer contacts, credit ledger, and purchase history."
        actions={
          <Button
            onClick={() => {
              setSelectedCustomer(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 px-4 rounded-lg shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search customers by name, phone, email, or address..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />
      </div>

      <DataTable
        data={filteredCustomers}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No customers found"
        emptyDescription="Add customers to manage contacts, credit ledger, and sales receipts."
        emptyAction={
          <Button
            onClick={() => {
              setSelectedCustomer(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 px-4 rounded-lg shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

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

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Customer"
        description={`Are you sure you want to remove "${customerToDelete?.name}" from your customer directory?`}
        confirmText="Delete Customer"
        isLoading={isSubmitting}
      />
    </div>
  )
}
