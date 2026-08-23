import { describe, it, expect } from 'vitest'
import { en } from '@/locales/en'
import { ne } from '@/locales/ne'

describe('Landing Page Nepali & English Localization Suite', () => {
  it('should have matching dictionary keys in English and Nepali locales', () => {
    function getKeys(obj: any, prefix = ''): string[] {
      return Object.keys(obj).reduce((acc: string[], key: string) => {
        const pre = prefix ? `${prefix}.${key}` : key
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          acc.push(...getKeys(obj[key], pre))
        } else {
          acc.push(pre)
        }
        return acc
      }, [])
    }

    const enKeys = getKeys(en).sort()
    const neKeys = getKeys(ne).sort()

    expect(neKeys).toEqual(enKeys)
  })

  it('should contain non-empty Nepali translations for all keys', () => {
    function checkNonEmpty(obj: any, path = '') {
      for (const key of Object.keys(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        const val = obj[key]
        if (typeof val === 'object' && val !== null) {
          checkNonEmpty(val, currentPath)
        } else {
          expect(val).toBeTypeOf('string')
          expect((val as string).trim().length).toBeGreaterThan(0)
        }
      }
    }

    checkNonEmpty(ne)
  })

  it('should preserve proper product/brand names without awkward translation', () => {
    expect(ne.hero.nprFreeModel).toContain('रु. ०')
    expect(ne.nepal.badge).toBe('स्थानीय व्यावसायिक परिवेश')
    expect(ne.faq.q1).toContain('Inventory Lite')
    expect(ne.footer.builtFor).toContain('नेपालका साना व्यवसायहरूका लागि निर्मित')
  })
})
