import React from 'react'
import Image from 'next/image'

interface AppLogoProps {
  className?: string
  iconOnly?: boolean
  size?: number
  showText?: boolean
  textColor?: string
}

export function AppLogo({
  className = '',
  iconOnly = false,
  size = 32,
  showText = true,
  textColor = 'text-slate-900',
}: AppLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-lg shadow-sm border border-indigo-200/50 bg-indigo-600">
        <Image
          src="/icons/icon.svg"
          alt="Inventory Lite Logo"
          width={size}
          height={size}
          className="object-cover transition-transform hover:scale-105"
          priority
        />
      </div>

      {!iconOnly && showText && (
        <span className={`text-[16px] font-extrabold tracking-tight ${textColor}`}>
          Inventory<span className="text-indigo-600 ml-0.5 font-black">Lite</span>
        </span>
      )}
    </div>
  )
}
