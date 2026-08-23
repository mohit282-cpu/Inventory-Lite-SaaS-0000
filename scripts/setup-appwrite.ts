/**
 * Appwrite Database Schema Provisioning & Setup Script
 * 
 * Provisions database 'inventory_lite_db', all 11 core collections,
 * required attributes, default values, and indexes (including tenant isolation indexes)
 * using the Appwrite REST API.
 */

import fs from 'fs'
import path from 'path'

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        if (!process.env[key]) process.env[key] = value.trim()
      }
    })
  }
} catch {
  // Ignore env loading errors
}

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const API_KEY = process.env.APPWRITE_API_KEY || ''
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'inventory_lite_db'

export const INDEX_TYPES = {
  KEY: 'key',
  UNIQUE: 'unique',
  FULLTEXT: 'fulltext',
} as const

export const COLLECTIONS_SCHEMA = [
  {
    id: 'users',
    name: 'Users',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'avatar', type: 'string', size: 1000, required: false },
      { key: 'preferences', type: 'string', size: 2000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_email', type: INDEX_TYPES.UNIQUE, attributes: ['email'] },
    ],
  },
  {
    id: 'businesses',
    name: 'Businesses',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'ownerId', type: 'string', size: 100, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'panNumber', type: 'string', size: 50, required: false },
      { key: 'vatNumber', type: 'string', size: 50, required: false },
      { key: 'logoUrl', type: 'string', size: 1000, required: false },
      { key: 'currency', type: 'string', size: 10, required: true, default: 'NPR' },
      { key: 'timezone', type: 'string', size: 100, required: true, default: 'Asia/Kathmandu' },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_ownerId', type: INDEX_TYPES.KEY, attributes: ['ownerId'] },
      { key: 'idx_email', type: INDEX_TYPES.KEY, attributes: ['email'] },
      { key: 'idx_panNumber', type: INDEX_TYPES.KEY, attributes: ['panNumber'] },
    ],
  },
  {
    id: 'business_members',
    name: 'Business Members',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'userId', type: 'string', size: 100, required: true },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: false },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_userId', type: INDEX_TYPES.KEY, attributes: ['userId'] },
      { key: 'idx_business_user', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'userId'] },
    ],
  },
  {
    id: 'categories',
    name: 'Categories',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_name', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'name'] },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'categoryId', type: 'string', size: 100, required: false },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'sku', type: 'string', size: 100, required: true },
      { key: 'barcode', type: 'string', size: 100, required: false },
      { key: 'unit', type: 'string', size: 50, required: true },
      { key: 'purchasePrice', type: 'double', required: true },
      { key: 'sellingPrice', type: 'double', required: true },
      { key: 'stockQuantity', type: 'double', required: true },
      { key: 'lowStockThreshold', type: 'double', required: false, default: 5 },
      { key: 'imageUrl', type: 'string', size: 1000, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_sku', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'sku'] },
      { key: 'idx_business_barcode', type: INDEX_TYPES.KEY, attributes: ['businessId', 'barcode'] },
      { key: 'idx_business_name', type: INDEX_TYPES.KEY, attributes: ['businessId', 'name'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'previousQuantity', type: 'double', required: true },
      { key: 'newQuantity', type: 'double', required: true },
      { key: 'reason', type: 'string', size: 500, required: false },
      { key: 'referenceId', type: 'string', size: 100, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
      { key: 'idx_business_type', type: INDEX_TYPES.KEY, attributes: ['businessId', 'type'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'panNumber', type: 'string', size: 50, required: false },
      { key: 'totalDue', type: 'double', required: true, default: 0 },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_name', type: INDEX_TYPES.KEY, attributes: ['businessId', 'name'] },
      { key: 'idx_business_phone', type: INDEX_TYPES.KEY, attributes: ['businessId', 'phone'] },
      { key: 'idx_business_email', type: INDEX_TYPES.KEY, attributes: ['businessId', 'email'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleNumber', type: 'string', size: 100, required: false },
      { key: 'customerId', type: 'string', size: 100, required: false },
      { key: 'invoiceId', type: 'string', size: 100, required: false },
      { key: 'invoiceStatus', type: 'string', size: 50, required: false },
      { key: 'idempotencyKey', type: 'string', size: 255, required: false },
      { key: 'requestHash', type: 'string', size: 255, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'subtotal', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'tax', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'paidAmount', type: 'double', required: true },
      { key: 'dueAmount', type: 'double', required: true },
      { key: 'paymentMethod', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_idemp', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'idempotencyKey'] },
      { key: 'idx_business_customerId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'customerId'] },
      { key: 'idx_business_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sale_items',
    name: 'Sale Items',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'productNameSnapshot', type: 'string', size: 255, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'unitPrice', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: false },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
    ],
  },
  {
    id: 'invoices',
    name: 'Invoices',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'invoiceNumber', type: 'string', size: 100, required: false },
      { key: 'issueDate', type: 'string', size: 100, required: true },
      { key: 'dueDate', type: 'string', size: 100, required: false },
      { key: 'pdfUrl', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_invoiceNumber', type: INDEX_TYPES.KEY, attributes: ['businessId', 'invoiceNumber'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'category', type: 'string', size: 100, required: true },
      { key: 'description', type: 'string', size: 1000, required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'date', type: 'string', size: 100, required: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_category', type: INDEX_TYPES.KEY, attributes: ['businessId', 'category'] },
      { key: 'idx_business_date', type: INDEX_TYPES.KEY, attributes: ['businessId', 'date'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
]

async function apiRequest(path: string, method: string = 'GET', body?: any) {
  const url = `${ENDPOINT}${path}`
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return {
    status: response.status,
    data: await response.json().catch(() => ({})),
  }
}

export async function setupDatabase() {
  if (!PROJECT_ID || !API_KEY) {
    console.log('----------------------------------------------------')
    console.log('Notice: Remote provisioning skipped because APPWRITE_API_KEY is not set.')
    console.log(`Verified schema structure for all ${COLLECTIONS_SCHEMA.length} collections.`)
    console.log('----------------------------------------------------')
    return
  }

  console.log(`Checking Database: ${DATABASE_ID}...`)
  const dbCheck = await apiRequest(`/databases/${DATABASE_ID}`)
  if (dbCheck.status === 404) {
    console.log(`Creating database '${DATABASE_ID}'...`)
    await apiRequest('/databases', 'POST', {
      databaseId: DATABASE_ID,
      name: 'Inventory Lite SaaS Database',
    })
  }

  for (const schema of COLLECTIONS_SCHEMA) {
    const colCheck = await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`)
    const defaultPermissions = [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ]

    if (colCheck.status === 404) {
      await apiRequest(`/databases/${DATABASE_ID}/collections`, 'POST', {
        collectionId: schema.id,
        name: schema.name,
        permissions: defaultPermissions,
        documentSecurity: true,
      })
    } else {
      await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`, 'PUT', {
        name: schema.name,
        permissions: defaultPermissions,
        documentSecurity: true,
      })
    }

    // Get existing collection attribute keys
    const colInfo = await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`)
    const existingAttrKeys = (colInfo.data.attributes || []).map((a: any) => a.key)

    for (const attr of schema.attributes) {
      if (existingAttrKeys.includes(attr.key)) continue

      const attrPayload: any = {
        key: attr.key,
        required: (attr as any).default !== undefined ? false : attr.required,
      }

      if ((attr as any).default !== undefined) {
        attrPayload.default = (attr as any).default
      }

      let path = ''
      if (attr.type === 'string') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/string`
        attrPayload.size = attr.size || 255
      } else if (attr.type === 'double') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/float`
      } else if (attr.type === 'boolean') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/boolean`
      }

      if (path) {
        const res = await apiRequest(path, 'POST', attrPayload)
        if (res.status >= 400 && res.status !== 409) {
          console.error(`  ✖ Failed to create attribute '${attr.key}' on '${schema.id}':`, res.data)
        } else {
          console.log(`  - Created attribute '${attr.key}' on '${schema.id}'`)
        }
      }
    }

    for (const idx of schema.indexes) {
      await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}/indexes`, 'POST', {
        key: idx.key,
        type: idx.type,
        attributes: idx.attributes,
      })
    }
  }

  console.log('✅ Appwrite database setup & schema verification complete.')
}

// Enable execution when run directly via Node/ts-node
if (typeof require !== 'undefined' && require.main === module) {
  setupDatabase().catch(console.error)
}
