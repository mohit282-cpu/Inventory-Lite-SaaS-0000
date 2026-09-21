import Link from 'next/link'
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="h-14 w-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
          <FileQuestion className="h-7 w-7" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">404 Error</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Page Not Found</h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            The page or resource you requested could not be found or may have been moved.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2">
            <Link href="/app/dashboard">
              <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
            </Link>
          </Button>

          <Button variant="outline" asChild className="h-10 px-5 border-slate-300 text-slate-800 font-bold text-xs gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Home Page
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
