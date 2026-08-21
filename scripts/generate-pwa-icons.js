const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate brand SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#3730a3" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <g transform="translate(96, 96)">
    <!-- Box Icon -->
    <path d="M160 32 L288 96 L160 160 L32 96 Z" fill="url(#accent)" opacity="0.9" />
    <path d="M32 96 L160 160 L160 288 L32 224 Z" fill="#ffffff" opacity="0.8" />
    <path d="M288 96 L160 160 L160 288 L288 224 Z" fill="#ffffff" opacity="0.95" />
    <path d="M80 180 L240 260" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
  </g>
  <text x="256" y="440" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle" letter-spacing="2">INVENTORY LITE</text>
</svg>`

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent)

// Generate a valid PNG file programmatically (minimal uncompressed PNG generator)
function createMinimalPNG(width, height) {
  // Simple solid color PNG buffer generation for 192 and 512
  const zlib = require('zlib')
  
  function writeDWord(buf, offset, val) {
    buf.writeUInt32BE(val, offset)
  }

  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  
  // IHDR
  const ihdr = Buffer.alloc(13)
  writeDWord(ihdr, 0, width)
  writeDWord(ihdr, 4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  function makeChunk(type, data) {
    const len = data.length
    const buf = Buffer.alloc(8 + len + 4)
    writeDWord(buf, 0, len)
    buf.write(type, 4)
    data.copy(buf, 8)
    
    // CRC
    let crc = 0xffffffff
    const crcBuf = buf.subarray(4, 8 + len)
    for (let i = 0; i < crcBuf.length; i++) {
      let c = (crc ^ crcBuf[i]) & 0xff
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      }
      crc = (crc >>> 8) ^ c
    }
    writeDWord(buf, 8 + len, (crc ^ 0xffffffff) >>> 0)
    return buf
  }

  const ihdrChunk = makeChunk('IHDR', ihdr)

  // IDAT raw scanlines (Indigo color #4F46E5FF)
  const lineSize = 1 + width * 4
  const rawData = Buffer.alloc(height * lineSize)
  for (let y = 0; y < height; y++) {
    const offset = y * lineSize
    rawData[offset] = 0 // filter type none
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4
      rawData[px] = 0x4f // R
      rawData[px + 1] = 0x46 // G
      rawData[px + 2] = 0xe5 // B
      rawData[px + 3] = 0xff // A
    }
  }

  const compressedData = zlib.deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', compressedData)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createMinimalPNG(192, 192))
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createMinimalPNG(512, 512))
fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), createMinimalPNG(512, 512))

console.log('PWA Icons generated successfully!')
