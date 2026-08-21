import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppwriteInitializer } from "@/components/AppwriteInitializer"
import { AuthProvider } from "@/context/auth-context"
import { RouteGuard } from "@/components/auth/route-guard"
import { Toaster } from "@/components/ui/toaster"
import { SWRegister } from "@/components/pwa/sw-register"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Inventory Lite - Multi-tenant Inventory SaaS",
  description: "Inventory and billing management software for small businesses in Nepal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inventory Lite",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
          <SWRegister />
          <RouteGuard>
            {children}
          </RouteGuard>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
