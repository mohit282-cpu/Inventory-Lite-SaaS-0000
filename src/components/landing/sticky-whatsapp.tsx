"use client"

import { useLanguage } from '@/context/language-context'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_NUMBER = "9779805330808"
const WHATSAPP_MSG_EN = "Hello, I want to know more about Inventory Lite and get an account for my business."
const WHATSAPP_MSG_NE = "नमस्कार, मलाई Inventory Lite बारे जानकारी चाहिएको छ र मेरो व्यवसायका लागि account बनाउन चाहन्छु।"

function getWhatsAppUrl(lang: string) {
  const msg = lang === 'ne' ? WHATSAPP_MSG_NE : WHATSAPP_MSG_EN
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export function StickyWhatsAppCTA() {
  const { t, language } = useLanguage()
  const whatsappUrl = getWhatsAppUrl(language)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <a
          href={whatsappUrl}
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
