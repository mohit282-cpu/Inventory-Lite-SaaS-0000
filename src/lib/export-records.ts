import { databases, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { Query } from 'appwrite'

export async function exportBusinessData(businessId: string, businessName: string): Promise<void> {
  if (!businessId) {
    throw new Error('Business ID is required for data export')
  }

  const collectionsToExport = [
    { key: 'products', collectionId: COLLECTIONS.PRODUCTS },
    { key: 'categories', collectionId: COLLECTIONS.CATEGORIES },
    { key: 'stockMovements', collectionId: COLLECTIONS.STOCK_MOVEMENTS },
    { key: 'customers', collectionId: COLLECTIONS.CUSTOMERS },
    { key: 'sales', collectionId: COLLECTIONS.SALES },
    { key: 'saleItems', collectionId: COLLECTIONS.SALE_ITEMS },
    { key: 'invoices', collectionId: COLLECTIONS.INVOICES },
    { key: 'payments', collectionId: COLLECTIONS.PAYMENTS },
    { key: 'expenses', collectionId: COLLECTIONS.EXPENSES },
  ]

  const exportedData: Record<string, any[]> = {
    exportedAt: [new Date().toISOString()],
    businessName: [businessName],
    businessId: [businessId],
  }

  for (const { key, collectionId } of collectionsToExport) {
    try {
      const result = await databases.listDocuments(DATABASE_ID, collectionId, [
        Query.equal('businessId', businessId),
        Query.limit(500),
      ])
      exportedData[key] = result.documents.map((doc) => {
        const { $databaseId, $collectionId, ...cleanDoc } = doc
        return cleanDoc
      })
    } catch {
      exportedData[key] = []
    }
  }

  const jsonStr = JSON.stringify(exportedData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeName = (businessName || 'business').toLowerCase().replace(/[^a-z0-9]/g, '_')
  link.download = `inventory-lite-export-${safeName}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
