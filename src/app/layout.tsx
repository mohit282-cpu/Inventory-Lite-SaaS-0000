import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppwriteInitializer } from "@/components/AppwriteInitializer"

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
        <AppwriteInitializer />
        {children}
      </body>
    </html>
  )
}
