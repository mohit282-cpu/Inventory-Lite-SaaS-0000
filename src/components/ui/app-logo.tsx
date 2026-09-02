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
  const isDarkBg = textColor.includes('text-white') || textColor.includes('text-slate-100') || textColor.includes('text-slate-200')
  const brandSuffixColor = isDarkBg ? 'text-indigo-400' : 'text-indigo-600'

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-lg shadow-sm border border-slate-200/80 bg-white">
        <Image
          src="/logo.png"
          alt="Inventory Lite Logo"
          width={size}
          height={size}
          className="object-contain transition-transform hover:scale-105"
          priority
        />
      </div>

      {!iconOnly && showText && (
        <span className={`text-[16px] font-extrabold tracking-tight ${textColor}`}>
          Inventory<span className={`${brandSuffixColor} ml-0.5 font-black`}>Lite</span>
        </span>
      )}
    </div>
  )
}
