"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoadingPage } from "@/components/ui/loading"

export default function HomePage() {
  const { user, activeBusiness, memberships, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    const hasBusiness = activeBusiness !== null || (memberships?.length ?? 0) > 0
    if (!hasBusiness) {
      router.push("/onboarding")
      return
    }

    router.push("/app/dashboard")
  }, [user, activeBusiness, memberships, isLoading, router])

  return <LoadingPage message="Navigating to your portal..." />
}
