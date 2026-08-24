const { chromium } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

async function generateScreenshots() {
  const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots')
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }

  console.log('Launching browser to capture product screenshots...')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })

  const screens = [
    {
      name: 'hero-dashboard.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-6">
            <!-- Header bar -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-4">
              <div class="flex items-center space-x-3">
                <div class="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">IL</div>
                <div>
                  <h1 class="text-lg font-extrabold text-white leading-tight">Shrestha Hardware & Construction</h1>
                  <p class="text-xs text-slate-400">Kathmandu, Nepal • PAN: 601234567 • 2083-05-08 BS (2026-08-24 AD)</p>
                </div>
              </div>
              <div class="flex items-center space-x-3 text-xs">
                <span class="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">● Store Active</span>
                <span class="px-3 py-1.5 rounded bg-slate-800 text-slate-300 font-mono">Role: Owner</span>
              </div>
            </div>

            <!-- Stat Cards -->
            <div class="grid grid-cols-4 gap-4">
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Today's Sales</div>
                <div class="text-2xl font-bold mono text-emerald-400 mt-2">Rs. 14,250</div>
                <div class="text-xs text-emerald-500 mt-1">↑ 12% vs yesterday (18 invoices)</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">This Month Sales</div>
                <div class="text-2xl font-bold mono text-white mt-2">Rs. 185,400</div>
                <div class="text-xs text-indigo-400 mt-1">142 Total transactions</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Customer Udhaar</div>
                <div class="text-2xl font-bold mono text-amber-400 mt-2">Rs. 42,800</div>
                <div class="text-xs text-amber-500 mt-1">12 Customers with dues</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Low Stock Items</div>
                <div class="text-2xl font-bold mono text-rose-400 mt-2">4 Items</div>
                <div class="text-xs text-rose-400 mt-1">Reorder required soon</div>
              </div>
            </div>

            <!-- Main Content Area: Recent Sales & Low Stock -->
            <div class="grid grid-cols-3 gap-6">
              <!-- Sales Table -->
              <div class="col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 class="font-bold text-white text-sm">Recent Sales & Transactions</h3>
                  <span class="text-xs text-indigo-400 font-mono">Real-time update</span>
                </div>
                <table class="w-full text-left text-xs">
                  <thead class="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th class="pb-2">Invoice #</th>
                      <th class="pb-2">Customer</th>
                      <th class="pb-2">Payment</th>
                      <th class="pb-2">Status</th>
                      <th class="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td class="py-2.5 text-indigo-400 font-bold">#INV-1048</td>
                      <td class="py-2.5 text-slate-200 font-sans">Ram Bahadur Construction</td>
                      <td class="py-2.5 text-slate-400">Fonepay</td>
                      <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">PAID</span></td>
                      <td class="py-2.5 text-right text-emerald-400 font-bold">Rs. 4,800</td>
                    </tr>
                    <tr>
                      <td class="py-2.5 text-indigo-400 font-bold">#INV-1047</td>
                      <td class="py-2.5 text-slate-200 font-sans">Walk-in Customer</td>
                      <td class="py-2.5 text-slate-400">Cash</td>
                      <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">PAID</span></td>
                      <td class="py-2.5 text-right text-emerald-400 font-bold">Rs. 1,250</td>
                    </tr>
                    <tr>
                      <td class="py-2.5 text-indigo-400 font-bold">#INV-1046</td>
                      <td class="py-2.5 text-slate-200 font-sans">Hari Krishna Supplier</td>
                      <td class="py-2.5 text-slate-400">Udhaar (Credit)</td>
                      <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">DUE</span></td>
                      <td class="py-2.5 text-right text-amber-400 font-bold">Rs. 6,500</td>
                    </tr>
                    <tr>
                      <td class="py-2.5 text-indigo-400 font-bold">#INV-1045</td>
                      <td class="py-2.5 text-slate-200 font-sans">Karki Electricals</td>
                      <td class="py-2.5 text-slate-400">Bank Transfer</td>
                      <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">PAID</span></td>
                      <td class="py-2.5 text-right text-emerald-400 font-bold">Rs. 1,700</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Quick Stock Overview -->
              <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 class="font-bold text-white text-sm">Low Stock Alerts</h3>
                  <span class="text-xs text-rose-400 font-bold">4 Action Needed</span>
                </div>
                <div class="space-y-2.5 text-xs">
                  <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div class="font-bold text-white">Copper Wire 1.5sqmm</div>
                      <div class="text-[11px] text-slate-400">Electricals</div>
                    </div>
                    <div class="text-right">
                      <div class="text-rose-400 font-bold mono">4 Rolls</div>
                      <div class="text-[10px] text-slate-500">Min: 10</div>
                    </div>
                  </div>
                  <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div class="font-bold text-white">PVC Elbow 1-inch</div>
                      <div class="text-[11px] text-slate-400">Plumbing</div>
                    </div>
                    <div class="text-right">
                      <div class="text-amber-400 font-bold mono">8 Pcs</div>
                      <div class="text-[10px] text-slate-500">Min: 15</div>
                    </div>
                  </div>
                  <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div class="font-bold text-white">Asian Paints Primer 4L</div>
                      <div class="text-[11px] text-slate-400">Paints</div>
                    </div>
                    <div class="text-right">
                      <div class="text-amber-400 font-bold mono">2 Cans</div>
                      <div class="text-[10px] text-slate-500">Min: 5</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'pos.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto grid grid-cols-12 gap-6">
            <!-- Left 7 Cols: Product Selector -->
            <div class="col-span-7 space-y-4">
              <div class="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                <input type="text" value="Ultratech Cement" class="bg-slate-950 text-white px-4 py-2 rounded-lg border border-slate-700 w-full text-sm font-medium focus:outline-none" placeholder="Search by product name or SKU...">
              </div>

              <!-- Product Grid -->
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-left space-y-2 cursor-pointer shadow-sm">
                  <div class="text-xs font-bold text-white">Ultratech Cement (50kg)</div>
                  <div class="text-xs text-slate-400 mono">SKU: UTR-CEM-01</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 850</span>
                    <span class="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">Stock: 120</span>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 cursor-pointer">
                  <div class="text-xs font-bold text-white">Shivam Cement (50kg)</div>
                  <div class="text-xs text-slate-400 mono">SKU: SHV-CEM-02</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 820</span>
                    <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Stock: 85</span>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 cursor-pointer">
                  <div class="text-xs font-bold text-white">TMT Rebar 12mm (8m)</div>
                  <div class="text-xs text-slate-400 mono">SKU: REB-12MM</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 1,150</span>
                    <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Stock: 250</span>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 cursor-pointer">
                  <div class="text-xs font-bold text-white">PVC Pipe 4-inch (10ft)</div>
                  <div class="text-xs text-slate-400 mono">SKU: PVC-PIP-4</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 450</span>
                    <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Stock: 42</span>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 cursor-pointer">
                  <div class="text-xs font-bold text-white">PVC Elbow 1-inch</div>
                  <div class="text-xs text-slate-400 mono">SKU: PVC-ELB-1</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 90</span>
                    <span class="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Stock: 8</span>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 cursor-pointer">
                  <div class="text-xs font-bold text-white">Copper Wire 1.5sqmm</div>
                  <div class="text-xs text-slate-400 mono">SKU: COP-WIR-15</div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-bold text-emerald-400 mono">Rs. 2,400</span>
                    <span class="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Stock: 4</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right 5 Cols: Active Bill Cart -->
            <div class="col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 class="font-bold text-white text-sm">New Sale / Bill</h3>
                  <span class="text-xs text-indigo-400 font-mono">#INV-1049</span>
                </div>
                
                <!-- Items list -->
                <div class="divide-y divide-slate-800 py-3 text-xs space-y-2">
                  <div class="flex items-center justify-between pt-2">
                    <div>
                      <div class="font-bold text-white">Ultratech Cement (50kg)</div>
                      <div class="text-slate-400 text-[11px]">Rs. 850 x 2 Bags</div>
                    </div>
                    <div class="font-bold mono text-emerald-400">Rs. 1,700.00</div>
                  </div>
                  <div class="flex items-center justify-between pt-2">
                    <div>
                      <div class="font-bold text-white">PVC Elbow 1-inch</div>
                      <div class="text-slate-400 text-[11px]">Rs. 90 x 4 Pcs</div>
                    </div>
                    <div class="font-bold mono text-emerald-400">Rs. 360.00</div>
                  </div>
                </div>
              </div>

              <!-- Payment summary -->
              <div class="pt-4 border-t border-slate-800 space-y-3">
                <div class="flex justify-between text-xs text-slate-400">
                  <span>Subtotal</span>
                  <span class="mono text-white">Rs. 2,060.00</span>
                </div>
                <div class="flex justify-between text-xs text-slate-400">
                  <span>Discount</span>
                  <span class="mono text-white">Rs. 60.00</span>
                </div>
                <div class="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Total Payable</span>
                  <span class="mono text-emerald-400 text-lg">Rs. 2,000.00</span>
                </div>

                <!-- Payment Methods -->
                <div class="grid grid-cols-3 gap-2 pt-2">
                  <button class="py-2 px-3 rounded bg-indigo-600 text-white font-bold text-xs text-center">Cash</button>
                  <button class="py-2 px-3 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold text-center">Fonepay</button>
                  <button class="py-2 px-3 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold text-center">Udhaar</button>
                </div>
                <button class="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md">Complete Sale & Print Bill</button>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'products.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-xl font-extrabold text-white">Product Catalog & Inventory</h1>
                <p class="text-xs text-slate-400">Total 148 items listed in 6 categories</p>
              </div>
              <button class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg">+ Add New Product</button>
            </div>

            <!-- Table Container -->
            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 font-semibold uppercase">
                  <tr>
                    <th class="pb-3">Product Name</th>
                    <th class="pb-3">SKU</th>
                    <th class="pb-3">Category</th>
                    <th class="pb-3 text-right">Cost Price</th>
                    <th class="pb-3 text-right">Selling Price</th>
                    <th class="pb-3 text-right">In Stock</th>
                    <th class="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80 font-mono">
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">Ultratech Cement (50kg)</td>
                    <td class="py-3 text-slate-400">UTR-CEM-01</td>
                    <td class="py-3 font-sans text-slate-300">Cement & Building</td>
                    <td class="py-3 text-right text-slate-400">Rs. 740</td>
                    <td class="py-3 text-right text-emerald-400 font-bold">Rs. 850</td>
                    <td class="py-3 text-right text-white font-bold">120 Bags</td>
                    <td class="py-3 text-center"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">In Stock</span></td>
                  </tr>
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">Shivam Cement (50kg)</td>
                    <td class="py-3 text-slate-400">SHV-CEM-02</td>
                    <td class="py-3 font-sans text-slate-300">Cement & Building</td>
                    <td class="py-3 text-right text-slate-400">Rs. 720</td>
                    <td class="py-3 text-right text-emerald-400 font-bold">Rs. 820</td>
                    <td class="py-3 text-right text-white font-bold">85 Bags</td>
                    <td class="py-3 text-center"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">In Stock</span></td>
                  </tr>
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">Copper Wire 1.5sqmm</td>
                    <td class="py-3 text-slate-400">COP-WIR-15</td>
                    <td class="py-3 font-sans text-slate-300">Electricals</td>
                    <td class="py-3 text-right text-slate-400">Rs. 2,050</td>
                    <td class="py-3 text-right text-emerald-400 font-bold">Rs. 2,400</td>
                    <td class="py-3 text-right text-rose-400 font-bold">4 Rolls</td>
                    <td class="py-3 text-center"><span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-sans font-semibold">Low Stock</span></td>
                  </tr>
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">TMT Rebar 12mm (8m)</td>
                    <td class="py-3 text-slate-400">REB-12MM</td>
                    <td class="py-3 font-sans text-slate-300">Steel & Hardware</td>
                    <td class="py-3 text-right text-slate-400">Rs. 980</td>
                    <td class="py-3 text-right text-emerald-400 font-bold">Rs. 1,150</td>
                    <td class="py-3 text-right text-white font-bold">250 Pcs</td>
                    <td class="py-3 text-center"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">In Stock</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'stock.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-xl font-extrabold text-white">Stock Movements & Adjustments</h1>
                <p class="text-xs text-slate-400">Track stock additions, sales deductions & adjustments</p>
              </div>
              <button class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg">+ Add Stock Movement</button>
            </div>

            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 font-semibold uppercase">
                  <tr>
                    <th class="pb-3">Date</th>
                    <th class="pb-3">Product Name</th>
                    <th class="pb-3">Type</th>
                    <th class="pb-3 text-right">Quantity</th>
                    <th class="pb-3 text-right">Previous Stock</th>
                    <th class="pb-3 text-right">New Stock</th>
                    <th class="pb-3">Note / Reference</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80 font-mono">
                  <tr>
                    <td class="py-3 text-slate-400">2083-05-08</td>
                    <td class="py-3 font-sans font-bold text-white">Ultratech Cement (50kg)</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans">Stock In (Purchase)</span></td>
                    <td class="py-3 text-right text-emerald-400 font-bold">+50 Bags</td>
                    <td class="py-3 text-right text-slate-400">70</td>
                    <td class="py-3 text-right text-white font-bold">120 Bags</td>
                    <td class="py-3 font-sans text-slate-300">Supplier: Arghakhanchi Traders</td>
                  </tr>
                  <tr>
                    <td class="py-3 text-slate-400">2083-05-08</td>
                    <td class="py-3 font-sans font-bold text-white">PVC Elbow 1-inch</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-sans">Stock Out (Sale)</span></td>
                    <td class="py-3 text-right text-rose-400 font-bold">-4 Pcs</td>
                    <td class="py-3 text-right text-slate-400">12</td>
                    <td class="py-3 text-right text-white font-bold">8 Pcs</td>
                    <td class="py-3 font-sans text-slate-300">Sale #INV-1049</td>
                  </tr>
                  <tr>
                    <td class="py-3 text-slate-400">2083-05-07</td>
                    <td class="py-3 font-sans font-bold text-white">Copper Wire 1.5sqmm</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-sans">Adjustment</span></td>
                    <td class="py-3 text-right text-amber-400 font-bold">-1 Roll</td>
                    <td class="py-3 text-right text-slate-400">5</td>
                    <td class="py-3 text-right text-white font-bold">4 Rolls</td>
                    <td class="py-3 font-sans text-slate-300">Damaged during storage</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'udhaar.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-xl font-extrabold text-white">Customer Udhaar & Credit Ledger</h1>
                <p class="text-xs text-slate-400">Track outstanding balances, credit limits & payment histories</p>
              </div>
              <button class="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">+ Record Payment</button>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Total Outstanding Udhaar</div>
                <div class="text-2xl font-bold mono text-amber-400 mt-1">Rs. 42,800</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Collected This Month</div>
                <div class="text-2xl font-bold mono text-emerald-400 mt-1">Rs. 28,500</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Customers With Dues</div>
                <div class="text-2xl font-bold mono text-white mt-1">12 Customers</div>
              </div>
            </div>

            <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 font-semibold uppercase">
                  <tr>
                    <th class="pb-3">Customer Name</th>
                    <th class="pb-3">Phone</th>
                    <th class="pb-3 text-right">Total Purchases</th>
                    <th class="pb-3 text-right">Total Paid</th>
                    <th class="pb-3 text-right">Outstanding Balance</th>
                    <th class="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80 font-mono">
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">Hari Krishna Supplier</td>
                    <td class="py-3 font-sans text-slate-400">9841234567</td>
                    <td class="py-3 text-right text-slate-300">Rs. 24,500</td>
                    <td class="py-3 text-right text-emerald-400">Rs. 18,000</td>
                    <td class="py-3 text-right text-amber-400 font-bold">Rs. 6,500 Due</td>
                    <td class="py-3 text-center"><button class="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-[11px]">Receive Cash</button></td>
                  </tr>
                  <tr>
                    <td class="py-3 font-sans font-bold text-white">Ram Bahadur Construction</td>
                    <td class="py-3 font-sans text-slate-400">9851098765</td>
                    <td class="py-3 text-right text-slate-300">Rs. 58,000</td>
                    <td class="py-3 text-right text-emerald-400">Rs. 46,000</td>
                    <td class="py-3 text-right text-amber-400 font-bold">Rs. 12,000 Due</td>
                    <td class="py-3 text-center"><button class="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-[11px]">Receive Cash</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'invoices.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-xl font-extrabold text-white">Tax Invoices & Billing Records</h1>
                <p class="text-xs text-slate-400">View, print A4 tax invoices and thermal receipts</p>
              </div>
            </div>

            <!-- Tax Invoice Document Card -->
            <div class="max-w-2xl mx-auto bg-white text-slate-900 p-6 rounded-xl shadow-xl space-y-4">
              <div class="flex justify-between border-b border-slate-300 pb-4">
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900">PASHUPATI TRADERS & HARDWARE</h2>
                  <p class="text-xs text-slate-600">New Road, Kathmandu, Nepal</p>
                  <p class="text-xs text-slate-600">PAN No: 601234567 • Phone: 01-4200000</p>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-indigo-700 mono">TAX INVOICE</div>
                  <div class="text-xs text-slate-500 mono">Invoice #: INV-2026-0048</div>
                  <div class="text-xs text-slate-500">Date: 2083-05-08 (BS)</div>
                </div>
              </div>

              <div class="text-xs space-y-1">
                <div><span class="font-bold">Billed To:</span> Ram Bahadur Construction</div>
                <div><span class="font-bold">Payment Method:</span> Fonepay QR (Online)</div>
              </div>

              <table class="w-full text-left text-xs border-t border-b border-slate-300 py-2">
                <thead>
                  <tr class="font-bold text-slate-700 border-b border-slate-200">
                    <th class="py-2">Item Description</th>
                    <th class="py-2 text-center">Qty</th>
                    <th class="py-2 text-right">Rate</th>
                    <th class="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 mono">
                  <tr>
                    <td class="py-2 font-sans">Ultratech Cement (50kg)</td>
                    <td class="py-2 text-center">5</td>
                    <td class="py-2 text-right">Rs. 850.00</td>
                    <td class="py-2 text-right font-bold">Rs. 4,250.00</td>
                  </tr>
                  <tr>
                    <td class="py-2 font-sans">PVC Pipe 4-inch (10ft)</td>
                    <td class="py-2 text-center">2</td>
                    <td class="py-2 text-right">Rs. 450.00</td>
                    <td class="py-2 text-right font-bold">Rs. 900.00</td>
                  </tr>
                </tbody>
              </table>

              <div class="flex justify-between items-center text-xs font-bold pt-2">
                <span>Total Payable (VAT Included)</span>
                <span class="text-base text-emerald-700 mono">Rs. 5,150.00</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'reports.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-xl font-extrabold text-white">Business Intelligence & Audit Center</h1>
                <p class="text-xs text-slate-400">Complete performance analytics, stock valuation & record health checks</p>
              </div>
              <span class="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono rounded">Fiscal Year 2082/83</span>
            </div>

            <!-- Performance Grid -->
            <div class="grid grid-cols-4 gap-4">
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Total Sales</div>
                <div class="text-2xl font-bold mono text-emerald-400 mt-1">Rs. 185,400</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Total Expenses</div>
                <div class="text-2xl font-bold mono text-rose-400 mt-1">Rs. 32,100</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-xs text-slate-400 font-semibold uppercase">Current Stock Value</div>
                <div class="text-2xl font-bold mono text-blue-400 mt-1">Rs. 412,000</div>
              </div>
              <div class="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/30">
                <div class="text-xs text-indigo-300 font-semibold uppercase">Estimated Profit</div>
                <div class="text-2xl font-bold mono text-emerald-400 mt-1">Rs. 48,250</div>
                <div class="text-[10px] text-slate-400 mt-1">Based on sales, cost & expenses</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    {
      name: 'business-reports.png',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="p-6">
          <div class="max-w-6xl mx-auto space-y-6">
            <div class="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 class="text-xl font-extrabold text-white">Business Health & Audit Center</h1>
                <p class="text-xs text-slate-400">Shrestha Hardware & Construction • 2083 BS</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">Audit Status: Clean</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
              <div class="col-span-2 space-y-4">
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 class="text-sm font-bold text-white">Revenue vs Operating Expenses</h3>
                  <div class="h-40 bg-slate-950 rounded-lg p-4 flex items-end justify-between border border-slate-800/80">
                    <div class="w-12 bg-indigo-600 rounded-t h-28 text-center text-[10px] text-white pt-1">Baisakh</div>
                    <div class="w-12 bg-indigo-600 rounded-t h-32 text-center text-[10px] text-white pt-1">Jestha</div>
                    <div class="w-12 bg-indigo-600 rounded-t h-24 text-center text-[10px] text-white pt-1">Asar</div>
                    <div class="w-12 bg-indigo-600 rounded-t h-36 text-center text-[10px] text-white pt-1">Shrawan</div>
                    <div class="w-12 bg-emerald-500 rounded-t h-40 text-center text-[10px] text-slate-950 font-bold pt-1">Bhadra</div>
                  </div>
                </div>
              </div>
              <div class="space-y-4">
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 class="text-sm font-bold text-white">Record Verification</h3>
                  <div class="text-xs space-y-2">
                    <div class="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                      <span class="text-slate-300">Unmatched Udhaar</span>
                      <span class="text-emerald-400 font-bold">0 Records</span>
                    </div>
                    <div class="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                      <span class="text-slate-300">Negative Stock</span>
                      <span class="text-emerald-400 font-bold">0 Items</span>
                    </div>
                    <div class="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                      <span class="text-slate-300">Unreconciled Cash</span>
                      <span class="text-emerald-400 font-bold">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  ]

  for (const screen of screens) {
    console.log(`Rendering screenshot: ${screen.name}...`)
    await page.setContent(screen.html)
    await page.waitForTimeout(500)
    const filePath = path.join(screenshotsDir, screen.name)
    await page.screenshot({ path: filePath, fullPage: false })
  }

  await browser.close()
  console.log('All real product screenshots created successfully!')
}

generateScreenshots().catch((err) => {
  console.error('Error creating screenshots:', err)
  process.exit(1)
})
