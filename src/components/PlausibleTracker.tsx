Add this snippet to your site's <head>
'use client'

import { useEffect } from 'react'
import { initPlausible } from '@/lib/analytics'

export function PlausibleTracker() {
  useEffect(() => {
    initPlausible()
  }, [])

  return null
}
