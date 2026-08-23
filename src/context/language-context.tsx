"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { en } from '@/locales/en'
import { ne } from '@/locales/ne'

export type LanguageType = 'en' | 'ne'

interface LanguageContextType {
  language: LanguageType
  setLanguage: (lang: LanguageType) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'inventory-lite-language'

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const dictionaries = { en, ne }

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.')
  let curr = obj
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part]
    } else {
      return undefined
    }
  }
  return typeof curr === 'string' ? curr : undefined
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>('en')

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY) as LanguageType | null
      if (savedLang === 'en' || savedLang === 'ne') {
        setLanguageState(savedLang)
        document.documentElement.lang = savedLang
      }
    } catch {
      // Catch localStorage errors in strict browser environments
    }
  }, [])

  const setLanguage = useCallback((lang: LanguageType) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
      document.documentElement.lang = lang
    } catch {
      // Catch storage quota/permission issues
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Try current language dictionary
      let val = getNestedValue(dictionaries[language], key)

      // 2. Fallback to English dictionary if key is missing in Nepali
      if (val === undefined && language !== 'en') {
        val = getNestedValue(dictionaries.en, key)
      }

      // 3. Ultimate fallback to key name
      if (val === undefined) {
        val = key
      }

      // 4. Parameter replacement
      if (params) {
        Object.entries(params).forEach(([pKey, pVal]) => {
          val = val!.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal))
        })
      }

      return val
    },
    [language]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (!context) {
    // Return a safe fallback context for components rendered outside LanguageProvider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>): string => {
        let val = getNestedValue(en, key) || key
        if (params) {
          Object.entries(params).forEach(([pKey, pVal]) => {
            val = val.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal))
          })
        }
        return val
      },
    }
  }
  return context
}
