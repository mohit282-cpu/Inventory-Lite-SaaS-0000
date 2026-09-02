const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const imgPath = path.join(__dirname, '..', 'public', 'Stoc Manage.png')
  const fileUrl = 'file:///' + imgPath.replace(/\\/g, '/')
  await page.goto(fileUrl)
  const bounds = await page.evaluate(() => {
    const img = document.querySelector('img')
    return img ? { width: img.naturalWidth, height: img.naturalHeight } : null
  })
  console.log('Image dimensions:', bounds)
  await browser.close()
}

run().catch(console.error)
