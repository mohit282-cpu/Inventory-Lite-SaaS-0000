"use client"


interface PasswordStrengthMeterProps {
  password?: string
}

export function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  if (!password) return null

  const calculateStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1
    return score
  }

  const score = calculateStrength(password)

  let label = 'Weak'
  let color = 'bg-red-500'
  let textColor = 'text-red-600'
  let widthClass = 'w-1/3'

  if (score >= 4) {
    label = 'Strong'
    color = 'bg-emerald-500'
    textColor = 'text-emerald-600'
    widthClass = 'w-full'
  } else if (score >= 2) {
    label = 'Fair'
    color = 'bg-amber-500'
    textColor = 'text-amber-600'
    widthClass = 'w-2/3'
  }

  return (
    <div className="space-y-1 mt-1.5" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-slate-500">Password Strength</span>
        <span className={textColor}>{label}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} ${widthClass} transition-all duration-300 rounded-full`} />
      </div>
    </div>
  )
}
