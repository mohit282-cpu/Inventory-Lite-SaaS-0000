import { describe, it, expect, vi } from 'vitest'
import { customerService } from '@/services/customer.service'

vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()

  return {
    DATABASE_ID: 'inventory_lite_db',
    COLLECTIONS: {
      CUSTOMERS: 'customers',
      SALES: 'sales',
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = { $id: id, $collectionId: colId, ...data }
        store.set(`${colId}:${id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return doc
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data }
        store.set(`${colId}:${id}`, updated)
        return updated
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        store.delete(`${colId}:${id}`)
        return {}
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(store.values()).filter((d) => d.$collectionId === colId)

        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch =
              qStr.match(/equal\("([^"]+)"/) ||
              qStr.match(/"attribute":"([^"]+)"/)
            const valueMatch =
              qStr.match(/\["([^"]+)"\]/) ||
              qStr.match(/"values":\s*\["([^"]+)"\]/)

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

describe('Customer Balance Due Deletion Constraint', () => {
  const businessId = 'biz_test_due_deletion'
  const userId = 'user_test_due_deletion'

  it('allows deletion of a customer with zero balance due', async () => {
    const customer = await customerService.createCustomer(
      { name: 'Zero Due Customer', phone: '9841999901', totalDue: 0 },
      businessId,
      userId
    )

    await expect(customerService.deleteCustomer(customer.$id, businessId)).resolves.not.toThrow()
  })

  it('prevents deletion of a customer with outstanding totalDue balance', async () => {
    const customer = await customerService.createCustomer(
      { name: 'Debtor Customer', phone: '9841999902', totalDue: 1500 },
      businessId,
      userId
    )

    await expect(customerService.deleteCustomer(customer.$id, businessId)).rejects.toThrow(
      /Cannot delete customer "Debtor Customer" with an outstanding balance due/
    )
  })
})
