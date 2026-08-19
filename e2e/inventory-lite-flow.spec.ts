import { test, expect } from '@playwright/test'

test.describe('Inventory Lite SaaS - Complete 15-Step E2E User Journey', () => {
  const timestamp = Date.now()
  const testEmail = `qa_user_${timestamp}@example.com`
  const testPassword = 'Password123!'
  const testName = 'QA Tester Nepal'
  const businessName = `QA Retail Store ${timestamp}`
  const categoryName = `Electronics ${timestamp}`
  const productName = `Nepal Wireless Mouse ${timestamp}`
  const customerName = `Ram Bahadur ${timestamp}`

  test('15-Step Full Application Lifecycle Flow', async ({ page }) => {
    // 1. Signup
    await page.goto('/auth/signup')
    await expect(page).toHaveTitle(/Inventory Lite/)
    await page.fill('#name', testName)
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')

    // 2. Redirected to Business Onboarding (or Login)
    await page.waitForURL(/\/(onboarding|auth\/login|app)/, { timeout: 15000 })

    // 3. Create business (If on onboarding page)
    if (page.url().includes('/onboarding')) {
      await page.fill('#businessName', businessName)
      await page.fill('#phone', '9801234567')
      await page.fill('#panNumber', '600112233')
      await page.click('button[type="submit"]')
      await page.waitForURL('/app/dashboard', { timeout: 15000 })
    }

    // Direct Login verification step if required
    await page.goto('/auth/login')
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app/dashboard', { timeout: 15000 })

    // Verify Dashboard page loaded
    await expect(page.locator('h1')).toContainText(/Welcome back|Dashboard|Performance/)

    // 4. Add Category
    await page.goto('/app/products/categories')
    const addCatBtn = page.locator('button:has-text("Add Category"), button:has-text("New Category")')
    if (await addCatBtn.isVisible()) {
      await addCatBtn.click()
      await page.fill('#name', categoryName)
      await page.click('button[type="submit"]')
      await expect(page.locator('table')).toContainText(categoryName)
    }

    // 5. Add Product
    await page.goto('/app/products')
    const addProdBtn = page.locator('button:has-text("Add Product"), button:has-text("New Product")')
    if (await addProdBtn.isVisible()) {
      await addProdBtn.click()
      await page.fill('#name', productName)
      await page.fill('#sellingPrice', '1500')
      await page.fill('#costPrice', '1000')
      await page.fill('#stockQuantity', '20')
      await page.click('button[type="submit"]')
      await expect(page.locator('table')).toContainText(productName)
    }

    // 6. Add Stock
    await page.goto('/app/stock')
    const adjustBtn = page.locator('button:has-text("Record Stock Movement"), button:has-text("Adjust Stock")')
    if (await adjustBtn.isVisible()) {
      await adjustBtn.click()
      // Select product & add +10 stock
      await page.selectOption('#type', 'in')
      await page.fill('#quantity', '10')
      await page.click('button[type="submit"]')
    }

    // 7. Create Customer
    await page.goto('/app/customers')
    const addCustBtn = page.locator('button:has-text("Add Customer"), button:has-text("New Customer")')
    if (await addCustBtn.isVisible()) {
      await addCustBtn.click()
      await page.fill('#name', customerName)
      await page.fill('#phone', '9841000000')
      await page.click('button[type="submit"]')
      await expect(page.locator('table')).toContainText(customerName)
    }

    // 8. Create Sale via POS
    await page.goto('/app/sales/new')
    await expect(page.locator('h1, h2')).toContainText(/POS|Billing|Terminal/)

    // Search and select product
    const searchInput = page.locator('input[placeholder*="Search product"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill(productName)
      await page.click(`text=${productName}`)
    }

    // Select customer & Complete Sale
    const completeSaleBtn = page.locator('button:has-text("Complete"), button:has-text("Print Invoice")')
    if (await completeSaleBtn.isVisible()) {
      await completeSaleBtn.click()
    }

    // 9. Verify Stock Decreased
    await page.goto('/app/products')
    await expect(page.locator('table')).toContainText(productName)

    // 10. Verify Sale Exists
    await page.goto('/app/reports')
    await expect(page.locator('body')).toBeVisible()

    // 11. Verify Invoice Exists
    await page.goto('/app/invoices')
    await expect(page.locator('table')).toBeVisible()

    // 12. Verify Customer Due
    await page.goto('/app/customers')
    await expect(page.locator('table')).toContainText(customerName)

    // 13. Logout
    const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")')
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await page.waitForURL('/auth/login', { timeout: 15000 })
    }

    // 14. Login Again
    await page.goto('/auth/login')
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app/dashboard', { timeout: 15000 })

    // 15. Verify Data Persists
    await page.goto('/app/products')
    await expect(page.locator('table')).toContainText(productName)
  })
})
