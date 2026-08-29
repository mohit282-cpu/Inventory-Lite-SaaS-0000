import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Devanagari } from "next/font/google"
import "./globals.css"
import { AppwriteInitializer } from "@/components/AppwriteInitializer"
import { AuthProvider } from "@/context/auth-context"
import { LanguageProvider } from "@/context/language-context"
import { RouteGuard } from "@/components/auth/route-guard"
import { Toaster } from "@/components/ui/toaster"
import { SWRegister } from "@/components/pwa/sw-register"
import { ExtensionErrorSuppressor } from "@/components/ui/extension-error-suppressor"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  fallback: ["system-ui", "sans-serif"],
})

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-devanagari",
  fallback: ["Kalimati", "Mangal", "sans-serif"],
})

export const metadata: Metadata = {
  title: {
    default: "Inventory Lite — Simple Inventory & Billing for Small Businesses in Nepal",
    template: "%s | Inventory Lite",
  },
  description: "Manage products, stock, sales, customers, and invoices with simple inventory software built for small businesses in Nepal. Plans from NPR 699/month.",
  applicationName: "Inventory Lite",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inventory Lite",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/icons/icon-192x192.png", type: "image/png" }],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "msapplication-TileImage": "/icons/icon-512x512.png",
    "msapplication-TileColor": "#4f46e5",
  },
}

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ne" className={`${inter.variable} ${devanagari.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isExt = function(str) {
                  return typeof str === 'string' && (
                    str.indexOf('chrome-extension:') !== -1 ||
                    str.indexOf('moz-extension:') !== -1 ||
                    str.indexOf('main-world.js') !== -1 ||
                    str.indexOf('normalizeKey') !== -1 ||
                    str.indexOf('onShortcutKeyUp') !== -1
                  );
                };
                var origError = console.error;
                console.error = function() {
                  var msg = Array.prototype.slice.call(arguments).map(String).join(' ');
                  if (isExt(msg)) return;
                  return origError.apply(console, arguments);
                };
                window.addEventListener('error', function(e) {
                  var file = e.filename || '';
                  var msg = e.message || '';
                  var stack = (e.error && e.error.stack) || '';
                  if (isExt(file) || isExt(msg) || isExt(stack)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var stack = (e.reason && (e.reason.stack || String(e.reason))) || '';
                  if (isExt(stack)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ExtensionErrorSuppressor />
        <LanguageProvider>
          <AuthProvider>
            <AppwriteInitializer />
            <SWRegister />
            <RouteGuard>
              {children}
            </RouteGuard>
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
