import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold text-slate-600">Loading Inventory Lite...</p>
      </div>
    </div>
  )
}
