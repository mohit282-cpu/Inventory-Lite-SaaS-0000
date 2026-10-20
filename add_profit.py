#!/usr/bin/env python3
with open('src/components/features/products/product-form-dialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section to replace - look for the selling price error + closing div
old = """                {errors.sellingPrice && (
                  <p className="text-xs text-red-600 font-medium">{errors.sellingPrice.message}</p>
                )}
              </div>
            </div>

            {/* Non-blocking selling price below purchase cost warning */"""

new = """                {errors.sellingPrice && (
                  <p className="text-xs text-red-600 font-medium">{errors.sellingPrice.message}</p>
                )}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-600">Profit per Unit</span>
                  <span className="text-xs font-mono">
                    {profit !== null
                      ? currencyCode === 'NPR'
                        ? 'NPR ' + profit.toLocaleString('en-US', {'minimumFractionDigits': 2, 'maximumFractionDigits': 2})
                        : 'NPR ' + profit.toFixed(2)
                      : '—'}
                  </span>
                </div>
                {profitMargin !== null && sellingPriceVal > 0 && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-600">Profit Margin</span>
                    <span className="text-xs font-mono">
                      {profitMargin >= 0
                        ? profitMargin.toFixed(2) + '%'
                        : '-' + str(abs(profitMargin)).toFixed(2) + '%'}
                    </span>
                  </div>
                )}
                {profitMargin === null && sellingPriceVal === 0 && (
                  <div className="text-xs text-slate-500">0%</div>
                )}
              </div>
            </div>

            {/* Non-blocking selling price below purchase cost warning */"""

if old in content:
    content = content.replace(old, new)
    with open('src/components/features/products/product-form-dialog.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Profit summary added')
else:
    print('FAIL: old string not found')
    lines = content.split('\n')
    for i in range(437, 443):
        print(f'{i+1}: {lines[i]}')