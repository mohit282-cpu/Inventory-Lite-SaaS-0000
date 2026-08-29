/**
 * Excel-native chart injection for the Mega Business Report.
 *
 * ExcelJS 4.4.0 does not expose `worksheet.addChart`, so genuine Excel-native
 * (and cell-dynamic) charts are produced here by injecting the standard OOXML
 * chart + drawing parts directly into the xlsx zip (JSZip). Values are bound to
 * worksheet cells via strRef/numRef so charts update when the underlying data
 * changes — they are NOT hardcoded raster images.
 *
 * All injection is best-effort and fallback-safe: on any failure the original
 * workbook buffer is returned untouched so the export is never corrupted.
 */

import JSZip from 'jszip'

export interface XmlChartSeries {
  name: string
  /** Value cell range, e.g. `'Dashboard'!$C$3:$C$8` (numRef). */
  data: string
  /** Fill ARGB for this series (e.g. 'FF2563EB'). */
  color: string
}

export interface XmlChartSpec {
  /** 1-based sheet index (position in the workbook). */
  sheetIndex: number
  /** Drawing anchor: from/to in cell coordinates (0-based col, 0-based row). */
  from: { col: number; row: number }
  to: { col: number; row: number }
  title: string
  /** Category (label) cell range, e.g. `'Dashboard'!$A$3:$A$8` (strRef). */
  categories: string
  series: XmlChartSeries[]
}

const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const REL_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
const REL_THEME = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme'

function escXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildChartXml(c: XmlChartSpec, strCache: string[], numCache: number[][]): string {
  const series = c.series
    .map((s, i) => {
      const id = i + 1
      const name = escXml(s.name)
      const nums = numCache[i] || EMPTY_NUMS
      const valCache =
        nums.length > 0
          ? `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${nums.length}"/>${nums
              .map((v, vi) => `<c:pt idx="${vi}"><c:v>${Number.isFinite(v) ? v : 0}</c:v></c:pt>`)
              .join('')}</c:numCache>`
          : `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numCache>`
      const catCache =
        strCache.length > 0
          ? `<c:strCache><c:ptCount val="${strCache.length}"/>${strCache
              .map((sx, si) => `<c:pt idx="${si}"><c:v>${escXml(sx)}</c:v></c:pt>`)
              .join('')}</c:strCache>`
          : `<c:strCache><c:ptCount val="0"/></c:strCache>`
      return (
        `<c:ser><c:idx val="${id}"/><c:order val="${id}"/>` +
        `<c:tx><c:strRef><c:f></c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${name}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
        `<c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>` +
        `<c:cat><c:strRef><c:f>${escXml(c.categories)}</c:f>${catCache}</c:strRef></c:cat>` +
        `<c:val><c:numRef><c:f>${escXml(s.data)}</c:f>${valCache}</c:numRef></c:val>` +
        `</c:ser>`
      )
    })
    .join('')
  const title = escXml(c.title)
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:lang val="en-US"/><c:style val="10"/><c:chart><c:autoTitleDeleted val="0"/>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr/></a:pPr><a:r><a:rPr lang="en-US"/><a:t>${title}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:plotArea><c:layout/>` +
    `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>` +
    series +
    `<c:gapWidth val="150"/><c:axId val="739133440"/><c:axId val="739133696"/></c:barChart>` +
    `<c:catAx><c:axId val="739133440"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="739133696"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="739133696"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="739133440"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>` +
    `<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/>` +
    `</c:chart></c:chartSpace>`
  )
}

function buildDrawingXml(
  frames: Array<{ spec: XmlChartSpec; chartRelId: string; frameId: number }>,
): string {
  const anchors = frames
    .map(({ spec, chartRelId, frameId }) => {
      const graphicFrame =
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>` +
        `<xdr:cNvPr id="${frameId}" name="Chart ${frameId}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">` +
        `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chartRelId}"/>` +
        `</a:graphicData></a:graphic></xdr:graphicFrame>`
      return (
        `<xdr:twoCellAnchor editAs="oneCell">` +
        `<xdr:from><xdr:col>${spec.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${spec.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        graphicFrame +
        `<xdr:clientData/></xdr:twoCellAnchor>`
      )
    })
    .join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    anchors +
    `</xdr:wsDr>`
  )
}

/**
 * Inject native charts into a serialized xlsx buffer. Groups charts by sheet;
 * each sheet gets one drawing part referencing its charts. Returns the new
 * buffer, or the original buffer on any failure.
 */
export async function injectCharts(
  buf: Buffer | ArrayBuffer,
  charts: XmlChartSpec[],
): Promise<Buffer> {
  if (!charts || charts.length === 0) return asBuffer(buf)
  try {
    return await doInject(asBuffer(buf), charts)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mega-report] chart injection failed; using chart-free workbook.', err)
    return asBuffer(buf)
  }
}

async function doInject(orig: Buffer, charts: XmlChartSpec[]): Promise<Buffer> {
  const zip = await JSZip.loadAsync(orig)

  const bySheet = new Map<number, XmlChartSpec[]>()
  for (const c of charts) {
    if (!bySheet.has(c.sheetIndex)) bySheet.set(c.sheetIndex, [])
    bySheet.get(c.sheetIndex)!.push(c)
  }

  let contentTypes = await zip.file('[Content_Types].xml')!.async('string')
  let globalChartId = 0
  const usedIds = new Set<number>()

  for (const [sheetIdx, specs] of bySheet) {
    const sheetNumber = await sheetNumberFor(zip, sheetIdx)
    if (!sheetNumber) continue
    const sheetFilePath = `xl/worksheets/sheet${sheetNumber}.xml`
    const sheetXml = await zip.file(sheetFilePath)!.async('string')
    const relsPath = `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`

    const drawingName = `drawing${sheetIdx}`
    const drawingPath = `xl/drawings/${drawingName}.xml`
    const drawingRelsPath = `xl/drawings/_rels/${drawingName}.xml.rels`

    // Parse the sheet's cell values once so chart caches can be populated.
    const shared = await loadSharedStrings(zip)
    const cells = parseSheetCells(sheetXml, shared)

    // One chart part per spec, globally unique file name.
    const drawingRels: string[] = []
    const frames: Array<{ spec: XmlChartSpec; chartRelId: string; frameId: number }> = []

    specs.forEach((spec, fi) => {
      let cid = (globalChartId += 1)
      while (usedIds.has(cid)) cid += 1
      usedIds.add(cid)
      const relId = `rId${fi + 1}`
      const chartPath = `xl/charts/chart${cid}.xml`
      frames.push({ spec, chartRelId: relId, frameId: fi + 1 })
      drawingRels.push(
        `<Relationship Id="${relId}" Type="${REL_CHART}" Target="${relTarget(chartPath)}"/>`,
      )
      const strCache = readRange(spec.categories, cells, true) as string[]
      const numCache = spec.series.map((s) => readRange(s.data, cells, false) as number[])
      zip.file(chartPath, buildChartXml(spec, strCache, numCache))
      zip.file(
        `xl/charts/_rels/chart${cid}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${REL_THEME}" Target="../theme/theme1.xml"/></Relationships>`,
      )
    })

    zip.file(drawingPath, buildDrawingXml(frames))
    zip.file(
      drawingRelsPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="${NS_REL}">${drawingRels.join('')}</Relationships>`,
    )

    // Content-type override for the drawing part.
    contentTypes = contentTypes.replace(
      '</Types>',
      `<Override PartName="/xl/drawings/${drawingName}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`,
    )

    // Worksheet relationship: sheet -> drawing (unique rId).
    const drawingRelId = await addSheetDrawingRel(zip, relsPath, drawingName)

    // Insert <drawing> element into worksheet xml in schema-correct position.
    insertDrawingElement(zip, sheetFilePath, sheetXml, drawingRelId)
  }

  zip.file('[Content_Types].xml', contentTypes)
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return out
}

function relTarget(chartPath: string): string {
  // From xl/drawings/ relative to xl/charts/: ../charts/chartN.xml
  return '../' + chartPath.replace(/^xl\//, '')
}

async function addSheetDrawingRel(
  zip: JSZip,
  relsPath: string,
  drawingName: string,
): Promise<string> {
  const existing = zip.file(relsPath)
  let rels: string
  if (existing) {
    rels = await existing.async('string')
  } else {
    rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_REL}"/>`
  }
  const target = `../drawings/${drawingName}.xml`
  // Find any existing rId to avoid collision.
  const ids = [...rels.matchAll(/Id="(rId\d+)"/g)].map((m) => Number(m[1].replace(/rId/, '')) || 0)
  let next = (ids.length ? Math.max(...ids) : 0) + 1
  let relId = `rId${next}`
  while (rels.includes(`Id="${relId}"`)) {
    next += 1
    relId = `rId${next}`
  }
  const insert = `<Relationship Id="${relId}" Type="${REL_DRAWING_TYPE}" Target="${target}"/>`
  rels = rels.replace('</Relationships>', insert + '</Relationships>')
  zip.file(relsPath, rels)
  return relId
}

async function insertDrawingElement(
  zip: JSZip,
  sheetFilePath: string,
  sheetXml: string,
  relId: string,
): Promise<void> {
  const drawingTag = `<drawing r:id="${relId}"/>`
  // Insert before tableParts / extLst / end of worksheet per CT_Worksheet order.
  let out = sheetXml
  const markers = ['<tableParts', '<extLst>', '</worksheet>']
  let idx = -1
  for (const m of markers) {
    const i = sheetXml.indexOf(m)
    if (i !== -1) {
      idx = i
      break
    }
  }
  if (idx !== -1) {
    out = sheetXml.slice(0, idx) + drawingTag + sheetXml.slice(idx)
  } else {
    out = sheetXml + drawingTag
  }
  zip.file(sheetFilePath, out)
}

const REL_DRAWING_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing'

const EMPTY_NUMS: number[] = []

interface SheetCell {
  isString: boolean
  value: string
}

/** Parse a worksheet XML into a map of cell ref (e.g. "H5") -> value. */
function parseSheetCells(sheetXml: string, shared: string[]): Map<string, SheetCell> {
  const map = new Map<string, SheetCell>()
  const cellRe = /<c r="([A-Z]+\d+)"([^>]*)>(.*?)<\/c>/g
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(sheetXml)) !== null) {
    const ref = m[1]
    const attrs = m[2] || ''
    const inner = m[3] || ''
    const isInline = /t="inlineStr"/.test(attrs)
    const isShared = /t="s"/.test(attrs)
    const isString = isInline || isShared
    let value = ''
    if (isInline) {
      const t = inner.match(/<is><t(?:[^>]*)>([\s\S]*?)<\/t><\/is>/)
      value = t ? decodeXml(t[1]) : ''
    } else if (isShared) {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)
      const idx = v ? Number(v[1]) : NaN
      value = Number.isFinite(idx) ? shared[idx] ?? '' : ''
    } else {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)
      value = v ? decodeXml(v[1]) : ''
    }
    map.set(ref, { isString, value })
  }
  return map
}

/** Load xl/sharedStrings.xml into an ordered array of strings. */
async function loadSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file('xl/sharedStrings.xml')
  if (!file) return []
  const xml = await file.async('string')
  const out: string[] = []
  const itemRe = /<si>(.*?)<\/si>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const si = m[1]
    // Concatenate all <t> runs inside the shared string item.
    let text = ''
    const runRe = /<t(?:[^>]*)>([\s\S]*?)<\/t>/g
    let rm: RegExpExecArray | null
    while ((rm = runRe.exec(si)) !== null) text += decodeXml(rm[1])
    out.push(text)
  }
  return out
}

/** Expand a single-column range formula (`'Dashboard'!$H$5:$H$12`) to values. */
function readRange(
  formula: string,
  cells: Map<string, SheetCell>,
  asString: boolean,
): string[] | number[] {
  const m = formula.match(/!(\$?)([A-Za-z]+)\$?(\d+):\$?([A-Za-z]+)\$?(\d+)/)
  if (!m) return asString ? [] : []
  const colLeft = m[2].toUpperCase()
  const colRight = m[4].toUpperCase()
  const rowStart = Number(m[3])
  const rowEnd = Number(m[5])
  const out: string[] | number[] = asString ? [] : []
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let cc = colNum(colLeft); cc <= colNum(colRight); cc++) {
      const ref = `${colLetter(cc)}${row}`
      const cell = cells.get(ref)
      if (!cell) continue
      if (asString) {
        ;(out as string[]).push(String(cell.value))
      } else {
        const n = Number(cell.value)
        ;(out as number[]).push(Number.isNaN(n) ? 0 : n)
      }
    }
  }
  return out
}

function colNum(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function colLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function decodeXml(s: string): string {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function sheetNumberFor(zip: JSZip, index: number): Promise<number | null> {
  const workbookXml = await zip.file('xl/workbook.xml')!.async('string')
  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')
  const sheetTags = [...workbookXml.matchAll(/<sheet[^>]*r:id="(rId\d+)"[^>]*\/?>/g)]
  const sel = sheetTags[index - 1]
  if (!sel) return null
  const relMap = new Map(
    [...workbookRels.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)].map((m) => [
      m[1],
      m[2],
    ]),
  )
  const relTarget = relMap.get(sel[1])
  if (!relTarget) return null
  const m = relTarget.match(/sheet(\d+)\.xml/)
  return m ? Number(m[1]) : null
}

function asBuffer(b: Buffer | ArrayBuffer): Buffer {
  return Buffer.isBuffer(b) ? b : Buffer.from(b as ArrayBuffer)
}
