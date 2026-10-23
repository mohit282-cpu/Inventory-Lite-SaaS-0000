export enum CookieCategory {
  Essential = 'essential',
  Analytics = 'analytics',
  Preferences = 'preferences',
}

export type CookieCategoryValue = `${CookieCategory}`

export interface CookieConfig {
  category: CookieCategoryValue
  name: string
  purpose: string
  duration: number // in months
  thirdParty?: boolean
}

export const CookieConfigs: Record<CookieCategoryValue, CookieConfig[]> = {
  [CookieCategory.Essential]: [
    {
      category: CookieCategory.Essential,
      name: 'session',
      purpose: 'Maintain user session across page requests',
      duration: 0,
    },
    {
      category: CookieCategory.Essential,
      name: 'auth',
      purpose: 'Authentication and authorization',
      duration: 0,
    },
  ],
  [CookieCategory.Analytics]: [
    {
      category: CookieCategory.Analytics,
      name: '_plausible',
      purpose: 'Anonymous analytics tracking',
      duration: 12,
      thirdParty: true,
    },
  ],
  [CookieCategory.Preferences]: [
    {
      category: CookieCategory.Preferences,
      name: 'theme',
      purpose: 'Store user theme preference',
      duration: 12,
    },
    {
      category: CookieCategory.Preferences,
      name: 'language',
      purpose: 'Store user language selection',
      duration: 12,
    },
  ],
}
