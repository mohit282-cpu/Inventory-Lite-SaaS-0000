const { chromium } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

async function generatePngIcons() {
  const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg')
  const svgUrl = `file:///${svgPath.replace(/\\/g, '/')}`

  console.log('Launching browser to render SVG to crisp PNG app icons...')
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const iconsDir = path.join(__dirname, '..', 'public', 'icons')
  const publicDir = path.join(__dirname, '..', 'public')

  // Render 512x512 PNG
  await page.setViewportSize({ width: 512, height: 512 })
  await page.goto(svgUrl)
  const png512Buffer = await page.screenshot({ omitBackground: false, type: 'png' })
  
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512Buffer)
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), png512Buffer)
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512Buffer)
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png512Buffer)
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), png512Buffer)

  // Render 192x192 PNG
  await page.setViewportSize({ width: 192, height: 192 })
  await page.goto(svgUrl)
  const png192Buffer = await page.screenshot({ omitBackground: false, type: 'png' })
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192Buffer)

  // Render 32x32 Favicon PNG
  await page.setViewportSize({ width: 32, height: 32 })
  await page.goto(svgUrl)
  const faviconBuffer = await page.screenshot({ omitBackground: false, type: 'png' })
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconBuffer)

  await browser.close()
  console.log('All PWA and native OS desktop app icons rendered successfully!')
}

generatePngIcons().catch((err) => {
  console.error('Error rendering PNG icons:', err)
  process.exit(1)
})
