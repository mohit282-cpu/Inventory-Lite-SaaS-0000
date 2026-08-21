'use client'

import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Button } from '@/components/ui/button'
import { Download, Share2, PlusSquare, CheckCircle2, X } from 'lucide-react'

export function InstallAppButton({ className = '' }: { className?: string }) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Installed
      </div>
    )
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall()
    } else if (isIOS) {
      setShowIOSModal(true)
    } else {
      // General browser instructions for Chrome/Edge desktop/Android
      alert('To install Inventory Lite: Tap your browser menu (⋮ or ⋯) and select "Install App" or "Add to Home Screen".')
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className={`border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 font-semibold h-8 text-xs shadow-none ${className}`}
      >
        <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
        Install App
      </Button>

      {/* iOS Add to Home Screen Guidance Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" /> Install on iPhone / iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Install <strong>Inventory Lite</strong> on your Apple Home Screen for fast, fullscreen app access:
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800">Step 1:</span> Tap the <strong>Share</strong> button in Safari toolbar.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800">Step 2:</span> Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
