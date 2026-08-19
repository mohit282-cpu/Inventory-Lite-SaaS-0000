import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppwriteInitializer } from "@/components/AppwriteInitializer"
import { AuthProvider } from "@/context/auth-context"
import { RouteGuard } from "@/components/auth/route-guard"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Inventory Lite - Multi-tenant Inventory SaaS",
  description: "Inventory and billing management for small businesses in Nepal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AppwriteInitializer />
          <RouteGuard>
            {children}
          </RouteGuard>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
