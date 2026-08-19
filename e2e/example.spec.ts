import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the page loads
  await expect(page).toHaveTitle(/Inventory Lite/)
  
  // Check for main heading
  await expect(page.locator('h1')).toContainText('Inventory Lite')
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  
  // This is a placeholder test - will be expanded when navigation is implemented
  // Example: await page.click('text=Login')
  // await expect(page).toHaveURL(/.*login/)
})
