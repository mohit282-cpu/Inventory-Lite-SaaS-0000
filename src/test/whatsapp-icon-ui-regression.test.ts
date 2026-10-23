import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('WhatsApp Icon & Design System Regression Tests', () => {
  describe('1. WhatsAppIcon Component Sizing', () => {
    it('WhatsAppIcon has explicit width and height attributes as fallback', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/ui/whatsapp-icon.tsx'),
        'utf-8'
      )
      expect(source).toContain('width="24"')
      expect(source).toContain('height="24"')
    })

    it('WhatsAppIcon has viewBox for proper scaling', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/ui/whatsapp-icon.tsx'),
        'utf-8'
      )
      expect(source).toContain('viewBox="0 0 24 24"')
    })

    it('WhatsAppIcon is marked aria-hidden and non-focusable', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/ui/whatsapp-icon.tsx'),
        'utf-8'
      )
      expect(source).toContain('aria-hidden="true"')
      expect(source).toContain('focusable="false"')
    })

    it('WhatsAppIcon uses fill="currentColor" for theme compatibility', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/ui/whatsapp-icon.tsx'),
        'utf-8'
      )
      expect(source).toContain('fill="currentColor"')
    })
  })

  describe('2. Single Floating WhatsApp Widget', () => {
    it('only one StickyWhatsAppCTA is mounted on the landing page', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/landing/landing-page.tsx'),
        'utf-8'
      )
      const matches = source.match(/StickyWhatsAppCTA/g) || []
      // One import + one JSX usage = 2 references
      expect(matches.length).toBe(2)
    })

    it('StickyWhatsAppCTA uses fixed positioning with safe-area spacing', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/landing/sticky-whatsapp.tsx'),
        'utf-8'
      )
      expect(source).toContain('fixed')
      expect(source).toContain('env(safe-area-inset-bottom')
    })

    it('StickyWhatsAppCTA icon uses compact sizing class h-5 w-5', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/components/landing/sticky-whatsapp.tsx'),
        'utf-8'
      )
      expect(source).toContain('h-5 w-5')
    })
  })

  describe('3. Tailwind v4 CSS Configuration', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/app/globals.css'),
      'utf-8'
    )

    it('uses Tailwind v4 @import directive, not v3 @tailwind directives', () => {
      expect(css).toContain('@import "tailwindcss"')
      expect(css).not.toContain('@tailwind base')
      expect(css).not.toContain('@tailwind components')
      expect(css).not.toContain('@tailwind utilities')
    })

    it('loads legacy tailwind.config.ts via @config', () => {
      expect(css).toContain('@config "../../tailwind.config.ts"')
    })

    it('defines all required CSS custom properties for semantic colors', () => {
      const requiredVars = [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--destructive',
        '--destructive-foreground',
        '--border',
        '--input',
        '--ring',
        '--radius',
        '--success',
        '--warning',
        '--info',
      ]
      for (const v of requiredVars) {
        expect(css).toContain(`${v}:`)
      }
    })

    it('defines dark mode CSS variables', () => {
      expect(css).toContain('.dark')
      expect(css).toContain('--background: 222.2 84% 4.9%')
    })

    it('applies background and foreground to body', () => {
      expect(css).toContain('background-color: hsl(var(--background))')
      expect(css).toContain('color: hsl(var(--foreground))')
    })

    it('has global border-color reset', () => {
      expect(css).toContain('border-color: hsl(var(--border))')
    })

    it('has Nepali Devanagari typography rules', () => {
      expect(css).toContain('html[lang="ne"] body')
      expect(css).toContain('--font-devanagari')
    })

    it('has print media styles', () => {
      expect(css).toContain('@media print')
    })

    it('has scrollbar utilities with direct hex values (no theme() calls)', () => {
      expect(css).toContain('.scrollbar-thin')
      expect(css).toContain('#334155')
      expect(css).not.toContain("theme('colors.")
      expect(css).not.toContain('theme("colors.')
    })

    it('has reduced-motion support', () => {
      expect(css).toContain('prefers-reduced-motion')
    })
  })

  describe('4. Production CSS Output Contains Required Utilities', () => {
    it('globals.css does not use @apply with undefined custom utilities in @layer base', () => {
      const css = readFileSync(
        join(process.cwd(), 'src/app/globals.css'),
        'utf-8'
      )
      // @apply with border-border, bg-background etc requires Tailwind to resolve
      // these as theme colors. With @config loading the legacy config, this works,
      // but we verify no bare @apply in @layer base for direct CSS properties.
      // Base styles should use direct CSS properties for reliability in v4.
      const baseSection = css.split('@layer base')[1]?.split('@layer')[0] || ''
      // The base section should NOT use @apply for core layout
      expect(baseSection).not.toContain('@apply bg-background')
      expect(baseSection).not.toContain('@apply border-border')
    })
  })
})
