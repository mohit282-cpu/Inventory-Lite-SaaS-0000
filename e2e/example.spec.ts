import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the page loads
  await expect(page).toHaveTitle(/Inventory Lite/)
  
  // Check for main heading or landing tag line
  await expect(page.locator('h1').first()).toContainText(/Know what you have|Inventory/i)
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/http:\/\/localhost:3000/)
})
