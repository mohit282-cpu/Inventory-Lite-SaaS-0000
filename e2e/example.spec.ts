import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Wait for main heading or container to render and hydrate
  await expect(page.locator('h1, header, main').first()).toBeVisible({ timeout: 15000 })
  
  // Verify document title after initial load/hydration
  await expect(page).toHaveTitle(/Inventory Lite/, { timeout: 15000 })
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1, header, main').first()).toBeVisible({ timeout: 15000 })
  await expect(page).toHaveURL(/http:\/\/localhost:3000/)
})

