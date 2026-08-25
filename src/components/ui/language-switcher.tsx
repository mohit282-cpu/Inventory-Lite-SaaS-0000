"use client"

import { useState, useRef, useEffect } from 'react'
import { useLanguage, LanguageType } from '@/context/language-context'
import { ChevronDown, Check } from 'lucide-react'

interface LanguageSwitcherProps {
  className?: string
  align?: 'left' | 'right'
}

export function LanguageSwitcher({ className = '', align = 'right' }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation (Escape key to close)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const selectLanguage = (lang: LanguageType) => {
    setLanguage(lang)
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  const currentLabel = language === 'ne' ? '🇳🇵 नेपाली' : '🇬🇧 English'

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('common.selectLanguage')}
        className="inline-flex items-center justify-between gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-44 rounded-lg bg-white border border-slate-200 shadow-lg ring-1 ring-black/5 z-50 py-1 animate-fade-in`}
        >
          <button
            type="button"
            role="menuitem"
            aria-current={language === 'ne' ? 'true' : undefined}
            onClick={() => selectLanguage('ne')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
              language === 'ne'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>🇳🇵</span>
              <span>नेपाली (NPR - रु)</span>
            </span>
            {language === 'ne' && <Check className="h-3.5 w-3.5 text-indigo-600" />}
          </button>

          <button
            type="button"
            role="menuitem"
            aria-current={language === 'en' ? 'true' : undefined}
            onClick={() => selectLanguage('en')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
              language === 'en'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>🇬🇧</span>
              <span>English</span>
            </span>
            {language === 'en' && <Check className="h-3.5 w-3.5 text-indigo-600" />}
          </button>

          <div className="mt-1 pt-1.5 border-t border-slate-100 px-3 py-1">
            <span className="inline-block w-full text-center text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              More Locales Coming Soon
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
