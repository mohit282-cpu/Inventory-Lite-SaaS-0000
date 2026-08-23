import React from 'react'
import { AppShellSkeleton } from '@/components/ui/skeleton'

interface AuthLoadingScreenProps {
  message?: string
}

export function AuthLoadingScreen({ message = 'Authenticating session...' }: AuthLoadingScreenProps) {
  return <AppShellSkeleton message={message} />
}
