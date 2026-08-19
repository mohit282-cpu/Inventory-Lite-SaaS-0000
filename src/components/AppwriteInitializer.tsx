'use client'

import { useEffect } from 'react'
import { client } from '@/lib/appwrite'

export function AppwriteInitializer() {
  useEffect(() => {
    // Automatically calls client.ping() to verify Appwrite setup when the app is opened
    try {
      if (typeof (client as any).ping === 'function') {
        (client as any).ping()
      }
    } catch (error) {
      console.warn('Appwrite ping execution:', error)
    }
  }, [])

  return null
}
