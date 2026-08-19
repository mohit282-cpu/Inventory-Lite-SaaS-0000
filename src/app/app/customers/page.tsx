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
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.name}</div>
          {item.panNumber && <div className="text-xs text-slate-500 font-mono">PAN: {item.panNumber}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (item) => <span className="font-mono text-slate-300">{item.phone || '-'}</span>,
    },
    {
      key: 'email',
      header: 'Email Address',
      render: (item) => <span className="text-slate-400">{item.email || '-'}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      render: (item) => <span className="text-slate-400 text-xs">{item.address || '-'}</span>,
    },
    {
      key: 'totalDue',
      header: 'Balance Due',
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-bold ${(item.totalDue || 0) > 0 ? 'text-red-400' : 'text-slate-400'}`}>
          Rs. {(item.totalDue || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDetailsCustomer(item)
              setIsDetailsOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title="View Details & Purchase History"
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
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title="Edit Customer"
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
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
            title="Delete Customer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers Directory"
        description="Maintain customer contacts, credit ledger, and purchase history."
        actions={
          <Button
            onClick={() => {
              setSelectedCustomer(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20"
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
        />
      </div>

      <DataTable
        data={filteredCustomers}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No customers added yet"
        emptyDescription="Add customers to associate sales orders and track outstanding credit balances."
        emptyAction={
          <Button
            onClick={() => {
              setSelectedCustomer(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add First Customer
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

      {/* Customer Details & History Modal */}
      <CustomerDetailsDialog
        customer={detailsCustomer}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setDetailsCustomer(null)
        }}
      />

      {/* Customer Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Remove Customer"
        description={`Are you sure you want to remove "${customerToDelete?.name}" from your customer directory?`}
        confirmText="Remove Customer"
        isLoading={isSubmitting}
      />
    </div>
  )
}
