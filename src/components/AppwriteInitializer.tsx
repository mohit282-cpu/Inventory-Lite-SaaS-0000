"use client"

import { useEffect } from "react"
import { client } from "@/lib/appwrite"

export function AppwriteInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined" && client && typeof (client as any).ping === "function") {
      (client as any)
        .ping()
        .then(() => {
          // eslint-disable-next-line no-console
          console.log("[Appwrite Setup] Appwrite backend server ping succeeded.")
        })
        .catch((err: any) => {
          console.warn("[Appwrite Setup] Appwrite ping check:", err)
        })
    }
  }, [])

  return null
}
