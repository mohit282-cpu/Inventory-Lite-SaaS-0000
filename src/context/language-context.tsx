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
  // Default language is 'ne' (Nepali) for local visitors
  const [language, setLanguageState] = useState<LanguageType>('ne')

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY) as LanguageType | null
      if (savedLang === 'en' || savedLang === 'ne') {
        setLanguageState(savedLang)
        document.documentElement.lang = savedLang
      } else {
        setLanguageState('ne')
        document.documentElement.lang = 'ne'
      }
    } catch {
      // Catch localStorage errors in strict browser environments
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (language === 'ne') {
        document.title = "Inventory Lite — नेपालका साना व्यवसायका लागि स्टक, बिक्री र उधारो व्यवस्थापन"
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
          metaDesc.setAttribute('content', "Inventory Lite बाट आफ्नो स्टक, बिक्री, उधारो, खर्च, बिल र व्यापारिक रेकर्डहरू सजिलै व्यवस्थापन गर्नुहोस्। योजना NPR ६९९/महिनाबाट सुरु।")
        }
      } else {
        document.title = "Inventory Lite — Simple Inventory & Billing for Small Businesses in Nepal"
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
          metaDesc.setAttribute('content', "Manage products, stock, sales, customers, and invoices with simple inventory software built for small businesses in Nepal. Plans from NPR 699/month.")
        }
      }
    }
  }, [language])

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
      language: 'ne',
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>): string => {
        let val = getNestedValue(ne, key) || key
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
