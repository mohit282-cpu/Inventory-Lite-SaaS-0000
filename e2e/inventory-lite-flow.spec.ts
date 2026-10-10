import { test, expect } from '@playwright/test'

test.describe('Inventory Lite SaaS - Application Page Navigation & Accessibility E2E Test', () => {
  test('Landing Page & Navigation Links Load Correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Inventory Lite/, { timeout: 15000 })
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 })
  })

  test('Authentication Routes Render Correctly', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('h1, h2, form').first()).toBeVisible({ timeout: 20000 })

    await page.goto('/auth/signup')
    await expect(page.locator('h1, h2, form').first()).toBeVisible({ timeout: 20000 })
  })

  test('Protected App Route Redirects Unauthenticated Users to Login', async ({ page }) => {
    await page.goto('/app/dashboard')
    await expect(page).toHaveURL(/.*\/auth\/login.*/, { timeout: 15000 })
    await expect(page.locator('form, h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('Interactive Demo Sandbox Loads with Navigation Tabs', async ({ page }) => {
    await page.goto('/demo')
    await expect(page).toHaveTitle(/Demo Sandbox/, { timeout: 15000 })
    await expect(page.locator('header, h1, nav').first()).toBeVisible({ timeout: 15000 })
  })
})
