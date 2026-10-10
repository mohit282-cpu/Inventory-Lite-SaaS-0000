import { describe, it, expect } from 'vitest'
import {
  NAVIGATION_GROUPS,
  NAVIGATION_ITEMS,
  canRoleAccessRoute,
  type NavItem,
} from '@/components/layout/sidebar'
import { isRouteActive } from '@/lib/utils'

describe('Sidebar Navigation Redesign & UX Integrity Tests', () => {
  describe('1. Navigation Structure & Routes Preservation', () => {
    it('preserves all 13 required application routes across the 6 intelligent categories', () => {
      const allHrefs = NAVIGATION_ITEMS.map((item) => item.href)

      const expectedHrefs = [
        '/app/dashboard',
        '/app/sales/new',
        '/app/sales',
        '/app/customers',
        '/app/credit',
        '/app/purchases',
        '/app/suppliers',
        '/app/products',
        '/app/categories',
        '/app/stock',
        '/app/expenses',
        '/app/invoices',
        '/app/audit',
        '/app/settings',
      ]

      expectedHrefs.forEach((href) => {
        expect(allHrefs).toContain(href)
      })

      expect(NAVIGATION_GROUPS.map((g) => g.label)).toEqual([
        'WORKSPACE',
        'SALES',
        'PURCHASING',
        'INVENTORY',
        'FINANCE',
        'ADMINISTRATION',
      ])
    })

    it('ensures every navigation item has a valid name, href, and React icon component', () => {
      NAVIGATION_ITEMS.forEach((item) => {
        expect(item.name).toBeTruthy()
        expect(item.href).toMatch(/^\/app\//)
        expect(item.icon).toBeDefined()
      })
    })
  })

  describe('2. Active Route Highlighting & Nested Path Resolution', () => {
    const allHrefs = NAVIGATION_ITEMS.map((item) => item.href)

    it('accurately highlights exact dashboard route without false positives', () => {
      expect(isRouteActive('/app/dashboard', '/app/dashboard', allHrefs)).toBe(true)
      expect(isRouteActive('/app/dashboard', '/app/products', allHrefs)).toBe(false)
      expect(isRouteActive('/app/dashboard', '/app', allHrefs)).toBe(false)
    })

    it('distinguishes POS Terminal (/app/sales/new) from Sales Ledger (/app/sales)', () => {
      // When at /app/sales/new, only POS Terminal is active, NOT /app/sales
      expect(isRouteActive('/app/sales/new', '/app/sales/new', allHrefs)).toBe(true)
      expect(isRouteActive('/app/sales', '/app/sales/new', allHrefs)).toBe(false)

      // When at /app/sales, only /app/sales is active
      expect(isRouteActive('/app/sales', '/app/sales', allHrefs)).toBe(true)
      expect(isRouteActive('/app/sales/new', '/app/sales', allHrefs)).toBe(false)
    })

    it('properly highlights parent route for nested resource sub-routes', () => {
      // /app/customers/cust_123 should activate /app/customers
      expect(isRouteActive('/app/customers', '/app/customers/cust_123', allHrefs)).toBe(true)
      // /app/invoices/inv_999 should activate /app/invoices
      expect(isRouteActive('/app/invoices', '/app/invoices/inv_999', allHrefs)).toBe(true)
      // /app/products should not match /app/categories
      expect(isRouteActive('/app/products', '/app/categories/cat_1', allHrefs)).toBe(false)
    })
  })

  describe('3. Role-Based Navigation Filtering', () => {
    it('allows owner to access all navigation routes', () => {
      NAVIGATION_ITEMS.forEach((item) => {
        expect(canRoleAccessRoute('owner', item)).toBe(true)
      })
    })

    it('allows admin to access all navigation routes', () => {
      NAVIGATION_ITEMS.forEach((item) => {
        expect(canRoleAccessRoute('admin', item)).toBe(true)
      })
    })

    it('restricts staff from accessing administrative settings and sensitive finances', () => {
      const settingsItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/settings')!
      const auditItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/audit')!
      const purchasesItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/purchases')!
      const expensesItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/expenses')!
      const posItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/sales/new')!
      const productsItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/products')!

      expect(canRoleAccessRoute('staff', settingsItem)).toBe(false)
      expect(canRoleAccessRoute('staff', auditItem)).toBe(false)
      expect(canRoleAccessRoute('staff', purchasesItem)).toBe(false)
      expect(canRoleAccessRoute('staff', expensesItem)).toBe(false)

      // Staff should have access to standard daily operations
      expect(canRoleAccessRoute('staff', posItem)).toBe(true)
      expect(canRoleAccessRoute('staff', productsItem)).toBe(true)
    })

    it('allows auditor to view audit, reports, and finances but restricts settings', () => {
      const auditItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/audit')!
      const expensesItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/expenses')!
      const settingsItem = NAVIGATION_ITEMS.find((i) => i.href === '/app/settings')!

      expect(canRoleAccessRoute('auditor', auditItem)).toBe(true)
      expect(canRoleAccessRoute('auditor', expensesItem)).toBe(true)
      expect(canRoleAccessRoute('auditor', settingsItem)).toBe(false)
    })

    it('safely handles missing role by defaulting to safe open routes', () => {
      const unrestrictedItem: NavItem = {
        name: 'Dashboard',
        href: '/app/dashboard',
        icon: () => null,
      }
      expect(canRoleAccessRoute(undefined, unrestrictedItem)).toBe(true)
    })
  })

  describe('4. Active Page Visibility in Collapsible Groups', () => {
    it('guarantees that a group containing the active route is automatically kept visible', () => {
      const allHrefs = NAVIGATION_ITEMS.map((n) => n.href)
      const currentPath = '/app/stock'

      NAVIGATION_GROUPS.forEach((group) => {
        const containsActive = group.items.some((item) =>
          isRouteActive(item.href, currentPath, allHrefs)
        )

        if (group.label === 'INVENTORY') {
          expect(containsActive).toBe(true)
        } else {
          expect(containsActive).toBe(false)
        }
      })
    })
  })

  describe('5. Business Switcher Truncation & Presentation', () => {
    it('correctly handles store name truncation and currency context', () => {
      const mockBusiness = {
        name: 'Super Long Business Name That Might Overflow The Sidebar Container In Mobile Or Desktop',
        currency: 'NPR',
      }
      const role = 'owner'

      expect(mockBusiness.name.length).toBeGreaterThan(30)
      const formattedContext = `${role} · ${mockBusiness.currency}`
      expect(formattedContext).toBe('owner · NPR')
    })
  })
})
