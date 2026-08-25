"use client"

import { useLanguage } from '@/context/language-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface LegalModalProps {
  isOpen: boolean
  type: 'privacy' | 'terms' | 'contact' | null
  onClose: () => void
}

export function LegalModal({ isOpen, type, onClose }: LegalModalProps) {
  const { t } = useLanguage()

  if (!type) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto scrollbar-thin">
        {type === 'privacy' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{t('legalModal.privacyTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {t('legalModal.lastUpdated')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <p>{t('legalModal.privacyIntro')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.privacyH1')}</h4>
              <p>{t('legalModal.privacyP1')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.privacyH2')}</h4>
              <p>{t('legalModal.privacyP2')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.privacyH3')}</h4>
              <p>{t('legalModal.privacyP3')}</p>
            </div>
          </>
        )}

        {type === 'terms' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{t('legalModal.termsTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {t('legalModal.lastUpdated')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <p>{t('legalModal.termsIntro')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.termsH1')}</h4>
              <p>{t('legalModal.termsP1')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.termsH2')}</h4>
              <p>{t('legalModal.termsP2')}</p>
              <h4 className="font-bold text-white text-sm">{t('legalModal.termsH3')}</h4>
              <p>{t('legalModal.termsP3')}</p>
            </div>
          </>
        )}

        {type === 'contact' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{t('legalModal.contactTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {t('legalModal.contactIntro')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-white text-sm">{t('legalModal.teamTitle')}</p>
                <p className="text-slate-400">{t('legalModal.location')}</p>
                <p className="text-indigo-400 font-mono">{t('legalModal.email')}</p>
                <p className="text-indigo-400 font-mono">{t('legalModal.phone')}</p>
              </div>
              <p className="text-slate-400">
                {t('legalModal.hours')}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
