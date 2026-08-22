/**
 * Calendar Preference Settings Service
 */

export interface CalendarSettings {
  primaryCalendar: 'BS' | 'AD'
  dateDisplay: 'BS+AD' | 'BS' | 'AD'
}

const SETTINGS_KEY = 'inventory_lite_calendar_settings'

const DEFAULT_SETTINGS: CalendarSettings = {
  primaryCalendar: 'BS',
  dateDisplay: 'BS+AD',
}

export function getCalendarSettings(): CalendarSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      primaryCalendar: parsed.primaryCalendar === 'AD' ? 'AD' : 'BS',
      dateDisplay: ['BS+AD', 'BS', 'AD'].includes(parsed.dateDisplay) ? parsed.dateDisplay : 'BS+AD',
    }
  } catch (err) {
    return DEFAULT_SETTINGS
  }
}

export function saveCalendarSettings(settings: CalendarSettings): CalendarSettings {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (err) {
      console.error('Failed to save calendar settings:', err)
    }
  }
  return settings
}
