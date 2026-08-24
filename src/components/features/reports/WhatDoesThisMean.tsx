"use client"

import { HelpCircle } from "lucide-react"

export interface WhatDoesThisMeanProps {
  title?: string
  explanation: string
  triggerText?: string
}

export function WhatDoesThisMean({ title, explanation, triggerText }: WhatDoesThisMeanProps) {
  const fullText = title ? `${title}: ${explanation}` : explanation
  return (
    <span 
      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors ml-2 no-print cursor-help"
      title={fullText}
    >
      {triggerText ? triggerText : (
        <>
          <HelpCircle className="h-3 w-3 mr-1" />
          [ ? ]
        </>
      )}
    </span>
  )
}
