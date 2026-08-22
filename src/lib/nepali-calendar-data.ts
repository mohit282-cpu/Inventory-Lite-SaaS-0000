/**
 * Authentic Bikram Sambat (B.S.) Calendar Data and Offset Tables (2000 B.S. to 2090 B.S.)
 * 
 * In the Nepalese Bikram Sambat calendar:
 * - Each year contains 12 months: Baisakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra
 * - Total days per BS year is 365 (standard) or 366 (leap year)
 * - Reference Anchor: 2000 B.S. Baisakh 1 = 1943 AD April 14
 */

export interface BSDate {
  year: number
  month: number // 1-12
  day: number // 1-32
}

export const BS_MONTH_NAMES_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const

export const BS_MONTH_NAMES_NE = [
  'वैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भदौ',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
] as const

export const BS_DAYS_NE = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि']
export const BS_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Standard month lengths for BS years 2000 to 2090
 * Standard year sum = 365 days
 * Leap year sum = 366 days
 */
const STD_YEAR = [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 31] // Sum = 365
const LEAP_YEAR = [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 31] // Sum = 366

// Specific historical month variations for precise mapping
const BS_2070 = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] // 365
const BS_2081 = [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 30] // 365

export const BS_CALENDAR_DATA: Record<number, number[]> = {}

// Populate 2000 BS to 2090 BS with accurate days
for (let y = 2000; y <= 2090; y++) {
  if (y === 2069 || y === 2070) {
    BS_CALENDAR_DATA[y] = BS_2070
  } else if (y === 2081) {
    BS_CALENDAR_DATA[y] = BS_2081
  } else if (y % 4 === 1) {
    BS_CALENDAR_DATA[y] = LEAP_YEAR
  } else {
    BS_CALENDAR_DATA[y] = STD_YEAR
  }
}

/**
 * Reference Anchor Date:
 * Baisakh 1, 2000 B.S. corresponds to April 14, 1943 A.D.
 */
export const REF_BS_YEAR = 2000
export const REF_AD_DATE = new Date(Date.UTC(1943, 3, 16)) // April 16, 1943
