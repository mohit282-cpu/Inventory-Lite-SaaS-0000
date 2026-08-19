"use client"

import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle2, X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((t) => {
        const isDestructive = t.variant === "destructive"

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
              isDestructive
                ? "bg-red-50 text-red-900 border-red-200"
                : "bg-white text-slate-900 border-slate-200"
            }`}
          >
            {isDestructive ? (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 text-sm">
              {t.title && <div className="font-bold text-slate-900">{t.title}</div>}
              {t.description && (
                <div className={`mt-0.5 text-xs font-medium ${isDestructive ? "text-red-700" : "text-slate-600"}`}>
                  {t.description}
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="Close notification"
              onClick={() => dismiss(t.id)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
