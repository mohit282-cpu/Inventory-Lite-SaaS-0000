"use client"

import { useLanguage } from '@/context/language-context'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_URL =
  "https://wa.me/9779805330808?text=Hello%2C%20I%27m%20interested%20in%20Inventory%20Lite%20for%20my%20business.%20I%20would%20like%20to%20know%20more%20about%20the%20software%20and%20how%20I%20can%20get%20an%20account."

export function StickyWhatsAppCTA() {
  const { t } = useLanguage()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-colors"
          aria-label={t('nav.startFree')}
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0" />
          {t('nav.startFree')}
        </a>
      </div>
    </div>
  )
}
