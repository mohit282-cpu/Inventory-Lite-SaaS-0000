#!/usr/bin/env python3
with open('src/services/sale.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic section
# The section to replace starts after "enforceKey: true," and the closing braces
old = """        },
        enforceKey: true,
        },
        persistentCheck: async (): Promise<Sale | null> => {
      if (!idempotencyKey || idempotencyKey.trim() === '') return null
      const matches = await this.list<Sale>(businessId, [
        Query.equal('idempotencyKey', idempotencyKey),
        Query.limit(1),
      ])
      const matchedSale = matches.length > 0 ? matches[0] : null
      return matchedSale
    },
      )"""

new = """        },
        enforceKey: true,
      },
      persistentCheck,
      async () => {"""

if old in content:
    content = content.replace(old, new)
    with open('src/services/sale.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Section replaced')
else:
    print('FAIL: old string not found')
    # Debug: print lines around 567-577
    lines = content.split('\n')
    for i in range(560, 580):
        print(f"{i+1}: {lines[i]}")