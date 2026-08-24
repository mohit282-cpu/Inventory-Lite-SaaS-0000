"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Product } from '@/types'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export interface InventoryReportProps {
  products: Product[]
}

export function InventoryReport({ products }: InventoryReportProps) {
  const activeProducts = products.filter(p => p.isActive)
  const sortedProducts = [...activeProducts].sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0))
  
  const totalValueAtCost = activeProducts.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.purchasePrice || 0)), 0)
  const totalValueAtRetail = activeProducts.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.sellingPrice || 0)), 0)

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader>
        <Link href="/app/products" className="group inline-flex items-center hover:opacity-80 transition-opacity">
          <CardTitle>Inventory Valuation & Status</CardTitle>
          <ExternalLink className="ml-2 w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
            <p className="text-2xl font-bold">{activeProducts.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Stock Cost Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValueAtCost)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Stock Retail Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValueAtRetail)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Potential Gross Margin</p>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValueAtRetail - totalValueAtCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Potential Gross Margin is based on current stock cost versus current retail value. It is not realized profit.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-6 border-b pb-4">
          * Potential Gross Margin represents non-realized profit assuming all current stock is sold at current retail price.
        </p>

        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
            Stock Alerts (Lowest First)
          </h4>
          <div className="rounded-md border max-h-[300px] overflow-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU/Barcode</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">No active products found.</TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((p) => {
                    const threshold = p.lowStockThreshold ?? 5
                    const qty = p.stockQuantity || 0
                    const isOutOfStock = qty === 0
                    const isLowStock = qty <= threshold && qty > 0

                    return (
                      <TableRow key={p.$id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.sku || p.barcode || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{qty}</TableCell>
                        <TableCell className="text-right">
                          {isOutOfStock ? (
                            <span className="text-red-600 font-medium">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="text-yellow-600 font-medium">Low Stock</span>
                          ) : (
                            <span className="text-green-600 font-medium">In Stock</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
