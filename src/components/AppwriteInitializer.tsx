"use client"

import { useEffect } from "react"
import { ping } from "@/lib/appwrite"

export function AppwriteInitializer() {
  useEffect(() => {
    ping()
      .then(() => {
        // Appwrite backend verified successfully on app open
      })
      .catch((error: unknown) => {
        console.error("Appwrite ping failed:", error)
      })
  }, [])

  return null
}
