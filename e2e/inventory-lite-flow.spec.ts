import { test, expect } from '@playwright/test'

test.describe('Inventory Lite SaaS - Application Page Navigation & Accessibility E2E Test', () => {
  test('Landing Page & Navigation Links Load Correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Inventory Lite/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('Authentication Routes Render Correctly', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('form, button[type="submit"]').first()).toBeVisible()

    await page.goto('/auth/signup')
    await expect(page.locator('form, button[type="submit"]').first()).toBeVisible()
  })
})
