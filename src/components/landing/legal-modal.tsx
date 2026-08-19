"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LegalModalProps {
  isOpen: boolean
  type: 'privacy' | 'terms' | 'contact' | null
  onClose: () => void
}

export function LegalModal({ isOpen, type, onClose }: LegalModalProps) {
  if (!type) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto scrollbar-thin">
        {type === 'privacy' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Privacy Policy</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Last updated: January 2026
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <p>
                Inventory Lite is committed to protecting the privacy and confidentiality of your store and business data.
              </p>
              <h4 className="font-bold text-white text-sm">1. Data Collection & Isolation</h4>
              <p>
                We collect business names, email addresses, product catalogs, customer transaction logs, and operational expenses strictly to deliver inventory and billing services. Your business data is isolated using tenant security filters and never shared with external third parties.
              </p>
              <h4 className="font-bold text-white text-sm">2. Security & Storage</h4>
              <p>
                All account passwords are encrypted and processed securely. Store records are maintained on secure database clusters with strict role-based access control.
              </p>
              <h4 className="font-bold text-white text-sm">3. Contact</h4>
              <p>
                For privacy inquiries or data removal requests, please contact our support team.
              </p>
            </div>
          </>
        )}

        {type === 'terms' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Terms of Service</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Last updated: January 2026
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <p>
                By using Inventory Lite, you agree to these Terms of Service for your store account.
              </p>
              <h4 className="font-bold text-white text-sm">1. Account Responsibility</h4>
              <p>
                You are responsible for keeping your login credentials confidential and for all stock and transaction records logged under your business profile.
              </p>
              <h4 className="font-bold text-white text-sm">2. Usage Scope</h4>
              <p>
                Inventory Lite provides operational stock calculations, sales order records, customer due tracking, and billing invoice generation. It is designed as an operational inventory management system.
              </p>
              <h4 className="font-bold text-white text-sm">3. Service Availability</h4>
              <p>
                We strive for continuous application availability and regular backups of store data.
              </p>
            </div>
          </>
        )}

        {type === 'contact' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Contact & Support</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                We are here to help your small business succeed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-slate-300 py-2 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-white text-sm">Inventory Lite Support Team</p>
                <p className="text-slate-400">Kathmandu, Nepal</p>
                <p className="text-indigo-400 font-mono">Email: support@inventorylite.app</p>
                <p className="text-indigo-400 font-mono">Phone / WhatsApp: +977 9800000000</p>
              </div>
              <p className="text-slate-400">
                Support is available Sunday through Friday, 9:00 AM – 6:00 PM NPT.
              </p>
            </div>
          </>
        )}

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose} variant="outline" className="border-slate-800 bg-slate-900 text-white">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
