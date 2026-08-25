"use client"

import { useState } from 'react'
import { HelpCircle, Info, Calculator, CheckCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface TermExplanation {
  title: string
  titleNe?: string
  whatIsIt: string
  whatIsItNe?: string
  whyItMatters: string
  whyItMattersNe?: string
  howCalculated?: string
  howCalculatedNe?: string
  disclaimer?: string
  disclaimerNe?: string
}

export const FINANCIAL_TERMS_DICTIONARY: Record<string, TermExplanation> = {
  'Payment Reconciliation': {
    title: 'Payment Reconciliation',
    titleNe: 'भुक्तानी मिलान (Payment Reconciliation)',
    whatIsIt: 'Checks whether the payment recorded for a sale matches the amount that should have been paid.',
    whatIsItNe: 'बिक्रीमा रेकर्ड गरिएको भुक्तानी रकम र ग्राहकले बुझाउनुपर्ने वास्तविक रकम मिलेको छ कि छैन भनेर प्रणालीले जाँच गर्छ।',
    whyItMatters: 'Ensures that all cash or digital payments collected match your bill totals without hidden shortfalls or unrecorded change.',
    whyItMattersNe: 'नगद वा डिजिटल भुक्तानी र बिल रकम मिलेको सुनिश्चित गर्छ, जसले गर्दा घटी वा खुद्रा हिसाब नमिलेको समस्या देखिँदैन।',
    howCalculated: 'Recorded Payment = Bill Total - Customer Due Amount.',
    howCalculatedNe: 'रेकर्ड गरिएको भुक्तानी = कुल बिल रकम - ग्राहकको उधारो रकम।',
  },
  'Estimated Profit': {
    title: 'Estimated Profit',
    titleNe: 'अनुमानित नाफा (Estimated Profit)',
    whatIsIt: 'Operational estimate of profit based on recorded sales revenue minus recorded product costs (COGS) and recorded expenses.',
    whatIsItNe: 'रेकर्ड गरिएको बिक्री आम्दानीबाट सामानको खरिद मूल्य र दर्ता गरिएका पसलका खर्चहरू घटाएर निकालिएको अनुमानित नाफा।',
    whyItMatters: 'Gives shop owners a quick view of business profitability. This is an operational estimate, NOT an official tax audit profit.',
    whyItMattersNe: 'पसल मालिकलाई नाफाको अवस्था बुझ्न मद्दत गर्छ। यो सफ्टवेयरको अनुमानित हिसाब हो, कर कार्यालयको आधिकारिक रिपोर्ट होइन।',
    howCalculated: 'Sales Revenue − Recorded Product Costs − Recorded Expenses = Estimated Profit.',
    howCalculatedNe: 'कुल बिक्री आम्दानी − सामान खरिद लागत − दर्ता गरिएका खर्च = अनुमानित नाफा।',
    disclaimer: 'This estimate depends on the accuracy of purchase prices and recorded expenses entered in Inventory Lite.',
    disclaimerNe: 'यो नाफा सामानको खरिद मूल्य र दर्ता गरिएका खर्चहरूको यथार्थतामा निर्भर हुन्छ।',
  },
  'Gross Sales': {
    title: 'Gross Sales',
    titleNe: 'कुल बिक्री (Gross Sales)',
    whatIsIt: 'Total value of all items billed to customers before applying any discounts or taxes.',
    whatIsItNe: 'कुनै पनि छुट वा कर घटाउनु अघिको सबै सामानको कुल बिल रकम।',
    whyItMatters: 'Shows the overall volume of goods sold by your business.',
    whyItMattersNe: 'तपाईंको पसलबाट बिक्री भएको कुल सामानको परिमाण र मूल्य देखाउँछ।',
    howCalculated: 'Sum of (Item Quantity × Unit Selling Price).',
    howCalculatedNe: '(सामानको सङ्ख्या × प्रति एकाइ बिक्री मूल्य) को जोड।',
  },
  'Net Sales': {
    title: 'Net Sales',
    titleNe: 'खुद बिक्री (Net Sales)',
    whatIsIt: 'Actual sales value after deducting discounts given to customers.',
    whatIsItNe: 'ग्राहकलाई दिइएको छुट घटाएपछि कायम हुने वास्तविक बिक्री रकम।',
    whyItMatters: 'Reflects the actual billing revenue expected from your sales.',
    whyItMattersNe: 'छुट कटाएर ग्राहकबाट प्राप्त हुने वास्तविक आम्दानी देखाउँछ।',
    howCalculated: 'Gross Sales − Total Discounts = Net Sales.',
    howCalculatedNe: 'कुल बिक्री − कुल छुट = खुद बिक्री।',
  },
  'VAT': {
    title: 'Value Added Tax (VAT)',
    titleNe: 'मूल्य अभिवृद्धि कर (मूल्य अभिवृद्धि कर / VAT)',
    whatIsIt: 'Summary of VAT recorded on taxable sales in Inventory Lite.',
    whatIsItNe: 'इन्भेन्टरी लाइटमा करयोग्य बिक्रीमा रेकर्ड गरिएको मूल्य अभिवृद्धि कर (VAT) को विवरण।',
    whyItMatters: 'Helps VAT-registered businesses track tax collected from customers.',
    whyItMattersNe: 'भ्याटमा दर्ता पसलहरूलाई ग्राहकबाट सङ्कलन गरिएको करको विवरण हेर्न मद्दत गर्छ।',
    howCalculated: 'Taxable Sales Amount × VAT Rate (Standard 13% in Nepal).',
    howCalculatedNe: 'करयोग्य बिक्री रकम × १३% भ्याट दर।',
    disclaimer: 'This software report does NOT determine legal VAT liability or official tax returns. Consult your accountant or the Inland Revenue Department (IRD).',
    disclaimerNe: 'यो सफ्टवेयर रिपोर्टले कानुनी भ्याट दायित्व वा आधिकारिक कर चुक्ता निर्धारण गर्दैन। आफ्नो एकाउन्टेन्ट वा आन्तरिक राजस्व विभागसँग परामर्श गर्नुहोस्।',
  },
  'Stock Cost Value': {
    title: 'Stock Cost Value',
    titleNe: 'मौज्दातको खरिद मूल्य (Stock Cost Value)',
    whatIsIt: 'Estimated monetary value of your current physical inventory based on recorded cost/purchase prices.',
    whatIsItNe: 'रेकर्ड गरिएको खरिद मूल्यको आधारमा हाल पसलमा रहेको कुल मौज्दात (स्टक) को अनुमानित रकम।',
    whyItMatters: 'Shows how much capital is currently tied up in unsold goods inside your shop or warehouse.',
    whyItMattersNe: 'नबिकेको सामानमा तपाईंको कति लगानी अड्किएको छ भन्ने देखाउँछ।',
    howCalculated: 'Sum of (Current Stock Quantity × Purchase/Cost Price).',
    howCalculatedNe: '(हालको स्टक परिमाण × खरिद मूल्य) को जोड।',
  },
  'Potential Gross Margin': {
    title: 'Potential Gross Margin',
    titleNe: 'संभावित कुल नाफा दर (Potential Gross Margin)',
    whatIsIt: 'Estimated difference between current stock selling value and recorded purchase cost. This is NOT realized profit.',
    whatIsItNe: 'स्टकको बिक्री मूल्य र खरिद मूल्य बीचको अनुमानित अन्तर। यो बिक्री भई नसकेकोले प्राप्त भइसकेको नाफा होइन।',
    whyItMatters: 'Indicates potential earnings if all current inventory is sold at marked retail prices.',
    whyItMattersNe: 'हालको सबै स्टक तोकिएको मूल्यमा बिक्री हुँदा कति नाफा हुन सक्छ भन्ने सङ्केत गर्छ।',
    howCalculated: '(Total Stock Value at Selling Price) − (Total Stock Value at Purchase Cost).',
    howCalculatedNe: '(कुल स्टकको बिक्री मूल्य) − (कुल स्टकको खरिद मूल्य)।',
  },
  'Invoice Sequence': {
    title: 'Invoice Sequence',
    titleNe: 'इन्भ्वाइस नम्बर क्रम (Invoice Sequence)',
    whatIsIt: 'Checks whether invoice numbers follow a continuous, uninterrupted sequence without skipped numbers.',
    whatIsItNe: 'इन्भ्वाइस नम्बरहरू बीचमा नछुटि लगातार क्रमबद्ध रूपमा जारी भएका छन् कि छैनन् भनेर जाँच गर्छ।',
    whyItMatters: 'Sequential numbering is required for audit and IRD billing compliance in Nepal.',
    whyItMattersNe: 'लेखा परीक्षण र नेपालको आन्तरिक राजस्व विभागको नियम अनुसार बिल नम्बर लगातार क्रममा हुन आवश्यक छ।',
    howCalculated: 'Identifies missing numbers in numerical sequence (e.g. INV-1 to INV-3 with missing INV-2).',
    howCalculatedNe: 'संख्यात्मक क्रममा छुटेका नम्बरहरू पहिचान गर्छ।',
  },
  'Duplicate Invoice': {
    title: 'Duplicate Invoice Check',
    titleNe: 'दोहोरिएको इन्भ्वाइस जाँच (Duplicate Invoice Check)',
    whatIsIt: 'Checks if the exact same invoice number has been assigned to more than one bill or transaction.',
    whatIsItNe: 'एउटै इन्भ्वाइस नम्बर एकभन्दा बढी बिलमा गल्तीले परेको छ कि छैन भनेर जाँच गर्छ।',
    whyItMatters: 'Duplicate numbers create confusion in customer records and invalidate tax accounting.',
    whyItMattersNe: 'दोहोरिएका नम्बरले हिसाबकिताब बिर्गार्छ र कर विवरणमा त्रुटि ल्याउँछ।',
    howCalculated: 'Scans all invoices for non-unique invoice number strings.',
    howCalculatedNe: 'सबै इन्भ्वाइसहरूमा दोहोरिएका नम्बरहरू खोज्छ।',
  },
  'Data Completeness': {
    title: 'Data Completeness',
    titleNe: 'विवरणको पूर्णता (Data Completeness)',
    whatIsIt: 'Checks whether essential details (such as customer names, invoice IDs, or expense categories) are missing.',
    whatIsItNe: 'मुख्य विवरणहरू (जस्तै ग्राहकको नाम, इन्भ्वाइस आईडी, वा खर्चको शीर्षक) छुटेका छन् कि छैनन् भनेर हेर्छ।',
    whyItMatters: 'Complete data ensures clean financial reporting and audit readiness.',
    whyItMattersNe: 'पूर्ण विवरणले सफा वित्तीय रिपोर्टिङ र सहज लेखा परीक्षण सुनिश्चित गर्छ।',
  },
}

export interface WhatDoesThisMeanProps {
  termKey?: string
  title?: string
  explanation?: string
  triggerText?: string
}

export function WhatDoesThisMean({ termKey, title, explanation, triggerText }: WhatDoesThisMeanProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Look up term details from dictionary if termKey is provided
  const termInfo: TermExplanation | undefined = termKey ? FINANCIAL_TERMS_DICTIONARY[termKey] : undefined

  const displayTitle = title || termInfo?.title || 'Financial Term Explanation'
  const displayExplanation = explanation || termInfo?.whatIsIt || ''

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium ml-1.5 no-print cursor-pointer border-b border-dashed border-indigo-300 hover:border-indigo-600 pb-0.5"
        title={`Click to learn what ${displayTitle} means`}
      >
        {triggerText ? (
          triggerText
        ) : (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-indigo-200 hover:bg-indigo-100">
            <HelpCircle className="h-3 w-3" />
            What is this?
          </span>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-lg rounded-xl p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">{displayTitle}</DialogTitle>
                {termInfo?.titleNe && <p className="text-xs font-semibold text-slate-500">{termInfo.titleNe}</p>}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs sm:text-sm text-slate-700">
            {/* What is this? */}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700">
                <CheckCircle className="h-3.5 w-3.5" /> What does this mean?
              </h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                {displayExplanation}
              </p>
              {termInfo?.whatIsItNe && (
                <p className="text-xs text-slate-500 italic px-1 pt-0.5">{termInfo.whatIsItNe}</p>
              )}
            </div>

            {/* Why does it matter? */}
            {termInfo?.whyItMatters && (
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-700">
                  <Info className="h-3.5 w-3.5" /> Why does it matter?
                </h4>
                <p className="text-slate-600 leading-relaxed">{termInfo.whyItMatters}</p>
              </div>
            )}

            {/* How is it calculated? */}
            {termInfo?.howCalculated && (
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-700">
                  <Calculator className="h-3.5 w-3.5" /> How is it calculated?
                </h4>
                <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg text-slate-800 font-mono text-xs">
                  {termInfo.howCalculated}
                </div>
              </div>
            )}

            {/* Disclaimer / Note */}
            {termInfo?.disclaimer && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs text-indigo-900 leading-relaxed font-medium">
                ⚠️ <span className="font-bold">Note:</span> {termInfo.disclaimer}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold"
            >
              Got it, close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
