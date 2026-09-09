export interface PricingPlan {
  id: 'monthly' | 'sixMonth' | 'yearly'
  nameEn: string
  nameNe: string
  price: number
  priceFormatted: string
  periodEn: string
  periodNe: string
  billingNoteEn: string
  billingNoteNe: string
  effectiveMonthlyEn: string | null
  effectiveMonthlyNe: string | null
  regularPriceEquivalent: number | null
  regularPriceFormatted: string | null
  savings: number | null
  savingsFormatted: string | null
  discountPercent: number | null
  badgeKey: 'bestValue' | null
  isFeatured: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'monthly',
    nameEn: 'Monthly',
    nameNe: 'मासिक',
    price: 699,
    priceFormatted: '699',
    periodEn: '/month',
    periodNe: '/महिना',
    billingNoteEn: 'Billed monthly',
    billingNoteNe: 'मासिक बिलिङ',
    effectiveMonthlyEn: null,
    effectiveMonthlyNe: null,
    regularPriceEquivalent: null,
    regularPriceFormatted: null,
    savings: null,
    savingsFormatted: null,
    discountPercent: null,
    badgeKey: null,
    isFeatured: false,
  },
  {
    id: 'sixMonth',
    nameEn: '6 Months',
    nameNe: '६ महिना',
    price: 3999,
    priceFormatted: '3,999',
    periodEn: '/6 months',
    periodNe: '/६ महिना',
    billingNoteEn: 'Billed every 6 months',
    billingNoteNe: 'हर ६ महिनामा बिल',
    effectiveMonthlyEn: 'Equivalent to NPR 666.50/month',
    effectiveMonthlyNe: 'NPR ६६६.५०/महिना बराबर',
    regularPriceEquivalent: 4194,
    regularPriceFormatted: '4,194',
    savings: 195,
    savingsFormatted: '195',
    discountPercent: 4.65,
    badgeKey: null,
    isFeatured: false,
  },
  {
    id: 'yearly',
    nameEn: '1 Year',
    nameNe: '१ वर्ष',
    price: 7599,
    priceFormatted: '7,599',
    periodEn: '/year',
    periodNe: '/वर्ष',
    billingNoteEn: 'Billed annually',
    billingNoteNe: 'वार्षिक बिल',
    effectiveMonthlyEn: 'Equivalent to NPR 633.25/month',
    effectiveMonthlyNe: 'NPR ६३३.२५/महिना बराबर',
    regularPriceEquivalent: 8388,
    regularPriceFormatted: '8,388',
    savings: 789,
    savingsFormatted: '789',
    discountPercent: 9.41,
    badgeKey: 'bestValue',
    isFeatured: true,
  },
]
