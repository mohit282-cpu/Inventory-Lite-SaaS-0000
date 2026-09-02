const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

async function generateAllIcons() {
  const publicDir = path.join(__dirname, '..', 'public')
  const iconsDir = path.join(publicDir, 'icons')
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  const srcImgPath = path.join(publicDir, 'Stoc Manage.png')
  const imgBuf = fs.readFileSync(srcImgPath)
  const base64Img = imgBuf.toString('base64')
  const dataUri = `data:image/png;base64,${base64Img}`

  // Generate SVG icon that embeds the new logo image
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="${dataUri}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice" />
</svg>`
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8')
  fs.writeFileSync(path.join(publicDir, 'apple-icon.svg'), svgContent, 'utf-8')
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8')

  console.log('Rendering high quality PNG icon assets from Stoc Manage.png...')
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const renderPng = async (width, height) => {
    await page.setViewportSize({ width, height })
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
            img { width: 100%; height: 100%; object-fit: contain; display: block; }
          </style>
        </head>
        <body>
          <img src="${dataUri}" />
        </body>
      </html>
    `)
    return await page.screenshot({ omitBackground: true, type: 'png' })
  }

  // Render 512x512
  const png512 = await renderPng(512, 512)
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512)
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'logo.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), png512)

  // Render 192x192
  const png192 = await renderPng(192, 192)
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192)

  // Render 32x32 Favicon
  const png32 = await renderPng(32, 32)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png32)

  await browser.close()
  console.log('All icons successfully updated to use Stoc Manage.png logo!')
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
