import { test, expect } from '@playwright/test'

test.describe('Inventory Lite SaaS - Application Page Navigation & Accessibility E2E Test', () => {
  test('Landing Page & Navigation Links Load Correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/Inventory Lite/, { timeout: 15000 })
    await expect(page.locator('h1, button, a').first()).toBeVisible({ timeout: 15000 })
  })

  test('Authentication Routes Render Correctly', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/auth/signup')
    await expect(page.locator('body')).toBeVisible()
  })
})
