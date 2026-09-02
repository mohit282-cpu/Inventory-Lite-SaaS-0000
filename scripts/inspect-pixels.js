const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const imgPath = path.join(__dirname, '..', 'public', 'Stoc Manage.png')
  const fileUrl = 'file:///' + imgPath.replace(/\\/g, '/')
  await page.goto(fileUrl)
  const info = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let hasAlpha = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasAlpha = true
        break
      }
    }
    const topLeftPixel = [data[0], data[1], data[2], data[3]]
    return { width: canvas.width, height: canvas.height, hasAlpha, topLeftPixel }
  })
  console.log('Image details:', info)
  await browser.close()
}

run().catch(console.error)
