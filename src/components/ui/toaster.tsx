"use client"

import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle2, X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isDestructive = toast.variant === "destructive"

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
              isDestructive
                ? "bg-destructive text-destructive-foreground border-destructive/50"
                : "bg-background text-foreground border-border"
            }`}
          >
            {isDestructive ? (
              <AlertCircle className="h-5 w-5 text-destructive-foreground shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            )}

            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold">{toast.title}</div>}
              {toast.description && (
                <div className={`mt-0.5 ${isDestructive ? "text-destructive-foreground/90" : "text-muted-foreground"}`}>
                  {toast.description}
                </div>
              )}
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
