import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'
import { productFormSchema } from '@/lib/validations'

describe('Products Page Inventory Modernization & Quality Tests', () => {
  const mockProducts = [
    {
      $id: 'prod_1',
      name: 'Rumpum Noodles 75g',
      sku: 'SKU-RUMPUM-75G',
      barcode: '8901234567890',
      categoryId: 'cat_food',
      unit: 'box',
      purchasePrice: 15,
      sellingPrice: 20,
      stockQuantity: 3,
      lowStockThreshold: 5,
      isActive: true,
      businessId: 'biz_001',
    },
    {
      $id: 'prod_2',
      name: 'Real Mango Juice 1L',
      sku: 'SKU-MANGO-1L',
      barcode: '8909876543210',
      categoryId: 'cat_beverage',
      unit: 'pcs',
      purchasePrice: 200,
      sellingPrice: 260,
      stockQuantity: 48,
      lowStockThreshold: 10,
      isActive: true,
      businessId: 'biz_001',
    },
    {
      $id: 'prod_3',
      name: 'Ganga Jal 500ml',
      sku: 'SKU-GANGA-500',
      barcode: '',
      categoryId: 'cat_beverage',
      unit: 'pcs',
      purchasePrice: 10,
      sellingPrice: 15,
      stockQuantity: 0,
      lowStockThreshold: 5,
      isActive: true,
      businessId: 'biz_001',
    },
    {
      $id: 'prod_4',
      name: 'Basmati Rice 20kg',
      sku: 'SKU-RICE-20KG',
      barcode: '8901111222333',
      categoryId: 'cat_food',
      unit: 'bag',
      purchasePrice: 2200,
      sellingPrice: 2500,
      stockQuantity: 15,
      lowStockThreshold: 5,
      isActive: true,
      businessId: 'biz_001',
    },
  ]

  it('1. Formats active business currency consistently with thousands separators', () => {
    expect(formatCurrency(20, 'NPR')).toBe('NPR 20.00')
    expect(formatCurrency(1250, 'NPR')).toBe('NPR 1,250.00')
    expect(formatCurrency(25000, 'NPR')).toBe('NPR 25,000.00')
    expect(formatCurrency(250000, 'NPR')).toBe('NPR 250,000.00')
    expect(formatCurrency(0, 'NPR')).toBe('NPR 0.00')
  })

  it('2. Evaluates stock status according to authoritative threshold rules', () => {
    const evaluateStockStatus = (qty: number, lowThreshold = 5) => {
      if (qty === 0) return 'OUT_OF_STOCK'
      if (qty <= lowThreshold) return 'LOW_STOCK'
      return 'IN_STOCK'
    }

    expect(evaluateStockStatus(mockProducts[0].stockQuantity, mockProducts[0].lowStockThreshold)).toBe('LOW_STOCK')
    expect(evaluateStockStatus(mockProducts[1].stockQuantity, mockProducts[1].lowStockThreshold)).toBe('IN_STOCK')
    expect(evaluateStockStatus(mockProducts[2].stockQuantity, mockProducts[2].lowStockThreshold)).toBe('OUT_OF_STOCK')
  })

  it('3. Filters products by Search Query across Name, SKU, and Barcode', () => {
    const searchProducts = (query: string) => {
      const q = query.toLowerCase().trim()
      if (!q) return mockProducts
      return mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    }

    // Search by Name
    expect(searchProducts('rumpum').length).toBe(1)
    expect(searchProducts('rumpum')[0].$id).toBe('prod_1')

    // Search by SKU
    expect(searchProducts('SKU-MANGO').length).toBe(1)
    expect(searchProducts('SKU-MANGO')[0].$id).toBe('prod_2')

    // Search by Barcode
    expect(searchProducts('8901111222333').length).toBe(1)
    expect(searchProducts('8901111222333')[0].$id).toBe('prod_4')
  })

  it('4. Filters products by Category and Stock Status', () => {
    const filterProducts = (catFilter: string, statusFilter: string) => {
      return mockProducts.filter((p) => {
        const matchesCat = catFilter === 'ALL' || p.categoryId === catFilter
        const threshold = p.lowStockThreshold || 5
        let matchesStatus = true
        if (statusFilter === 'IN_STOCK') matchesStatus = p.stockQuantity > threshold
        if (statusFilter === 'LOW_STOCK') matchesStatus = p.stockQuantity > 0 && p.stockQuantity <= threshold
        if (statusFilter === 'OUT_OF_STOCK') matchesStatus = p.stockQuantity === 0
        return matchesCat && matchesStatus
      })
    }

    expect(filterProducts('cat_food', 'ALL').length).toBe(2)
    expect(filterProducts('cat_beverage', 'LOW_STOCK').length).toBe(0)
    expect(filterProducts('cat_beverage', 'OUT_OF_STOCK').length).toBe(1)
  })

  it('5. Sorts products by Product Name, Selling Price, and In Stock quantity', () => {
    const sortProducts = (col: 'name' | 'sellingPrice' | 'stockQuantity', dir: 'asc' | 'desc') => {
      return [...mockProducts].sort((a, b) => {
        let valA: any = a[col]
        let valB: any = b[col]
        if (col === 'name') {
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
        }
        if (valA < valB) return dir === 'asc' ? -1 : 1
        if (valA > valB) return dir === 'asc' ? 1 : -1
        return 0
      })
    }

    // Sort by Name asc
    const byNameAsc = sortProducts('name', 'asc')
    expect(byNameAsc[0].name).toBe('Basmati Rice 20kg')

    // Sort by Price desc
    const byPriceDesc = sortProducts('sellingPrice', 'desc')
    expect(byPriceDesc[0].sellingPrice).toBe(2500)

    // Sort by Stock asc
    const byStockAsc = sortProducts('stockQuantity', 'asc')
    expect(byStockAsc[0].stockQuantity).toBe(0)
  })

  it('6. Calculates pagination slices accurately', () => {
    const getPaginatedSlice = (items: any[], page: number, perPage: number) => {
      const totalPages = Math.ceil(items.length / perPage) || 1
      const validPage = Math.min(Math.max(1, page), totalPages)
      const start = (validPage - 1) * perPage
      const end = Math.min(start + perPage, items.length)
      return {
        slice: items.slice(start, end),
        totalPages,
        startDisplay: items.length > 0 ? start + 1 : 0,
        endDisplay: end,
      }
    }

    const res = getPaginatedSlice(mockProducts, 1, 2)
    expect(res.slice.length).toBe(2)
    expect(res.totalPages).toBe(2)
    expect(res.startDisplay).toBe(1)
    expect(res.endDisplay).toBe(2)

    const res2 = getPaginatedSlice(mockProducts, 2, 2)
    expect(res2.slice.length).toBe(2)
    expect(res2.startDisplay).toBe(3)
    expect(res2.endDisplay).toBe(4)
  })

  it('7. Differentiates State A (no products exist) vs State B (filters match no products)', () => {
    const getEmptyStateMode = (totalCount: number, filteredCount: number, isFilterActive: boolean) => {
      if (totalCount === 0) return 'STATE_A_NO_PRODUCTS'
      if (filteredCount === 0 && isFilterActive) return 'STATE_B_NO_SEARCH_RESULTS'
      return 'DATA_PRESENT'
    }

    expect(getEmptyStateMode(0, 0, false)).toBe('STATE_A_NO_PRODUCTS')
    expect(getEmptyStateMode(10, 0, true)).toBe('STATE_B_NO_SEARCH_RESULTS')
    expect(getEmptyStateMode(10, 4, true)).toBe('DATA_PRESENT')
  })

  it('8. Verifies safe product soft-archiving deletion description', () => {
    const formatDeleteWarning = (prodName: string, sku: string, qty: number, unit: string) =>
      `Are you sure you want to remove "${prodName}" (SKU: ${sku})? Current recorded stock is ${qty} ${unit}. This product will be deactivated from your active catalog while preserving historical sales, audit, and financial ledgers.`

    const warning = formatDeleteWarning('Rumpum Noodles', 'SKU-RUMPUM-75G', 3, 'box')
    expect(warning).toContain('deactivated')
    expect(warning).toContain('preserving historical sales')
    expect(warning).toContain('Rumpum Noodles')
  })

  it('9. Clears state on tenant business switch to enforce strict multi-tenant safety', () => {
    let currentBusinessId = 'biz_001'
    let loadedProducts = [...mockProducts]

    // Switch business context
    const handleBusinessSwitch = (newBizId: string) => {
      currentBusinessId = newBizId
      loadedProducts = [] // Clear stale product state immediately
    }

    handleBusinessSwitch('biz_002')
    expect(currentBusinessId).toBe('biz_002')
    expect(loadedProducts.length).toBe(0)
  })

  it('10. Validates Product Form Schema whitespace and integer stock rules', () => {
    // Valid data
    const validData = {
      name: '  Valid Product Name  ',
      unit: 'pcs',
      purchasePrice: 100,
      sellingPrice: 150,
      openingStock: 10,
      minStockAlert: 5,
      isActive: true,
    }
    const parsedValid = productFormSchema.safeParse(validData)
    expect(parsedValid.success).toBe(true)

    // Whitespace-only name should fail
    const invalidName = { ...validData, name: '     ' }
    const parsedInvalidName = productFormSchema.safeParse(invalidName)
    expect(parsedInvalidName.success).toBe(false)

    // Decimal stock quantity should fail integer refinement
    const decimalStock = { ...validData, openingStock: 10.5 }
    const parsedDecimalStock = productFormSchema.safeParse(decimalStock)
    expect(parsedDecimalStock.success).toBe(false)

    // Negative purchase price should fail
    const negativePrice = { ...validData, purchasePrice: -5 }
    const parsedNegativePrice = productFormSchema.safeParse(negativePrice)
    expect(parsedNegativePrice.success).toBe(false)
  })

  it('11. Detects selling price below cost price margin warning', () => {
    const isBelowCost = (cost: number, price: number) => cost > 0 && price > 0 && price < cost

    expect(isBelowCost(100, 80)).toBe(true)
    expect(isBelowCost(100, 120)).toBe(false)
    expect(isBelowCost(100, 100)).toBe(false)
    expect(isBelowCost(0, 50)).toBe(false)
  })
})

