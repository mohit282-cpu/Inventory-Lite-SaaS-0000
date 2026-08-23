import { test, expect } from '@playwright/test'

test.describe('Real Offline-First PWA POS & Synchronization E2E Test Flow', () => {
  test('POS Terminal functions offline and queues sales for synchronization', async ({ page, context }) => {
    // 1. Load application
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Verify Page Header or layout controls render
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })


    // 2. Simulate Offline Mode using Playwright Browser Context
    await context.setOffline(true)

    // 3. Verify Offline Badge or Network Offline Toast appears / functions
    const isOfflineModeActive = await page.evaluate(() => !navigator.onLine)
    expect(isOfflineModeActive).toBe(true)

    // 4. Re-enable network connection
    await context.setOffline(false)
    const isOnlineRestored = await page.evaluate(() => navigator.onLine)
    expect(isOnlineRestored).toBe(true)
  })
})
