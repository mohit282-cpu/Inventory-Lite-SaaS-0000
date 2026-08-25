"use client"

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'
import { ShieldAlert, Mail, LogOut } from 'lucide-react'

export default function AccountBlockedPage() {
  const { logout, user } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      if (user?.$id && typeof window !== 'undefined') {
        localStorage.removeItem(`account_blocked_${user.$id}`)
      }
      await logout()
    } catch {
      // Fallback
    } finally {
      router.replace('/auth/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block mb-6">
          <AppLogo />
        </div>

        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-xl sm:px-10 text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-slate-900">Account Blocked</h1>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your Inventory Lite account and business data have been permanently deleted. This account can no longer access Inventory Lite.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Need help or have questions?</p>
            <p className="text-[11px] text-slate-500">
              If you believe this is an error, please reach out to our customer support team for assistance.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <a
              href="mailto:support@inventorylite.com?subject=Blocked%20Account%20Inquiry"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              <Mail className="h-4 w-4" /> Contact Support
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Log Out
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Inventory Lite SaaS. All rights reserved.
        </p>
      </div>
    </div>
  )
}
