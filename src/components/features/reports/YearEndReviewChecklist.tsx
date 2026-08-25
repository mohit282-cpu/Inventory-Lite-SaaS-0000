"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, Square, CheckCircle2, ListChecks, RotateCcw } from 'lucide-react'

export interface YearEndReviewChecklistProps {
  businessId: string
  yearLabel: string
}

interface ChecklistItem {
  id: string
  title: string
  titleNe: string
  description: string
  descriptionNe: string
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'sales_recorded',
    title: 'Have all sales been recorded?',
    titleNe: 'सबै बिक्रीहरू रेकर्ड गरिएका छन्?',
    description: 'Make sure all your sales (cash, online, and credit) are entered in Inventory Lite.',
    descriptionNe: 'तपाईंका सबै नगद, अनलाइन र उधारो बिक्रीहरू इन्भेन्टरी लाइटमा प्रविष्ट भएका छन् कि छैनन् निश्चित गर्नुहोस्।',
  },
  {
    id: 'expenses_recorded',
    title: 'Have all business expenses been recorded?',
    titleNe: 'सबै व्यापारिक खर्चहरू रेकर्ड गरिएका छन्?',
    description: 'Add rent, electricity, transport, supplies, staff tea, and other operational expenses.',
    descriptionNe: 'पसलको भाडा, बिजुली, ढुवानी, सामान खरिद तथा अन्य खर्चहरू दर्ता गर्नुहोस्।',
  },
  {
    id: 'customer_dues_checked',
    title: 'Have customer dues been checked?',
    titleNe: 'ग्राहकको उधारो हिसाब जाँच गरिएको छ?',
    description: 'Confirm that outstanding customer balances and credit ledgers are correct.',
    descriptionNe: 'उठ्न बाँकी ग्राहकको उधारो हिसाब र लेजर मौज्दात सही छ कि छैन पुष्टि गर्नुहोस्।',
  },
  {
    id: 'stock_checked',
    title: 'Has your stock been checked?',
    titleNe: 'भौतिक स्टक (मौज्दात) मिलाइएको छ?',
    description: 'Compare physical inventory in your shop/warehouse with recorded stock in Inventory Lite.',
    descriptionNe: 'पसलको वास्तविक मौज्दात (सामानको सङ्ख्या) र इन्भेन्टरी लाइटको स्टक दाँजेर हेर्नुहोस्।',
  },
  {
    id: 'cancelled_bills_reviewed',
    title: 'Have cancelled invoices been reviewed?',
    titleNe: 'रद्द गरिएका बिलहरूको समीक्षा गरिएको छ?',
    description: 'Make sure cancelled invoices were cancelled for correct and legitimate business reasons.',
    descriptionNe: 'रद्द गरिएका बिलहरू उपयुक्त र वास्तविक कारणले नै रद्द भएका हुन् भन्ने निश्चित गर्नुहोस्।',
  },
  {
    id: 'payment_differences_resolved',
    title: 'Have payment differences been resolved?',
    titleNe: 'भुक्तानी बेमेल हिसाबहरू सच्याइएको छ?',
    description: 'Check any sales where the payment amount recorded does not match the bill total.',
    descriptionNe: 'बिल रकम र रेकर्ड गरिएको भुक्तानी फरक परेका बिक्रीहरू जाँच गरी सच्याउनुहोस्।',
  },
  {
    id: 'invoice_sequence_checked',
    title: 'Have invoice sequence numbers been checked?',
    titleNe: 'इन्भ्वाइस नम्बरहरूको क्रम जाँच गरिएको छ?',
    description: 'Verify that sequential invoice numbers are continuous without unexplainable gaps or duplicates.',
    descriptionNe: 'इन्भ्वाइस नम्बरहरू क्रमबद्ध रूपमा छन् र कुनै नम्बर दोहोरिएको छैन भन्ने हेर्नुहोस्।',
  },
  {
    id: 'tax_vat_reviewed',
    title: 'Has tax/VAT information been reviewed?',
    titleNe: 'कर तथा भ्याट विवरण समीक्षा गरिएको छ?',
    description: 'Confirm your sales and tax records with your accountant or IRD guidelines where applicable.',
    descriptionNe: 'आफ्नो बिक्री र कर विवरण एकाउन्टेन्ट वा आन्तरिक राजस्व विभागको नियम अनुसार हेर्नुहोस्।',
  },
]

export function YearEndReviewChecklist({ businessId, yearLabel }: YearEndReviewChecklistProps) {
  const storageKey = `yearend_review_${businessId}_${yearLabel}`

  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore
        }
      }
    }
    return {}
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      localStorage.setItem(storageKey, JSON.stringify(checkedState))
    }
  }, [checkedState, storageKey, businessId])

  const toggleItem = (id: string) => {
    setCheckedState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const completedCount = CHECKLIST_ITEMS.filter((item) => checkedState[item.id]).length
  const progressPercent = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100)

  const markAll = () => {
    const allChecked: Record<string, boolean> = {}
    CHECKLIST_ITEMS.forEach((item) => {
      allChecked[item.id] = true
    })
    setCheckedState(allChecked)
  }

  const resetAll = () => {
    setCheckedState({})
  }

  return (
    <Card className="border border-slate-200 shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-600" />
              Year-End Audit Review Checklist
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Before sending your annual records to your accountant, complete these 8 checks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAll}
              className="text-xs font-bold h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark All Completed
            </Button>
            {completedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-xs font-semibold h-8 text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700">Audit Completion Progress</span>
            <span className="text-indigo-600">
              {completedCount} / {CHECKLIST_ITEMS.length} completed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = !!checkedState[item.id]

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'border-emerald-300 bg-emerald-50/40 text-slate-900 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="space-y-0.5 flex-1">
                  <span className={`text-xs sm:text-sm font-bold block ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {item.title}
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-snug">{item.description}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
