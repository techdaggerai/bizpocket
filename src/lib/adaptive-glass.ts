// ═══════════════════════════════════════════════════════════
// Adaptive Glass Manager — time-of-day refraction angle +
// cultural easing preference based on user's country
// ═══════════════════════════════════════════════════════════

const WARM_COUNTRIES = ['PK', 'IN', 'BD', 'NP', 'LK', 'AE', 'SA']
const COOL_COUNTRIES = ['JP']

// Currency → country for users without explicit country
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  JPY: 'JP', USD: 'US', EUR: 'DE', GBP: 'GB', INR: 'IN',
  PKR: 'PK', SAR: 'SA', AED: 'AE', BDT: 'BD', NGN: 'NG',
  BRL: 'BR', VND: 'VN', TRY: 'TR', CNY: 'CN', PHP: 'PH', IDR: 'ID',
}

export function deriveCountry(currency?: string, profileCountry?: string): string {
  if (profileCountry) return profileCountry
  if (currency) return CURRENCY_TO_COUNTRY[currency] || ''
  return ''
}

export function initAdaptiveGlass(userCountry?: string) {
  if (typeof document === 'undefined') return

  // Time-of-day refraction angle
  const hour = new Date().getHours()
  const baseAngle = hour < 8 ? 110
    : hour < 12 ? 135
    : hour < 17 ? 165
    : hour < 20 ? 195
    : 220

  // Cultural warmth shift
  const warmth = WARM_COUNTRIES.includes(userCountry || '') ? 10
    : COOL_COUNTRIES.includes(userCountry || '') ? -5
    : 0

  document.documentElement.style.setProperty('--glass-angle', `${baseAngle + warmth}deg`)

  // Set cultural easing preference
  if (COOL_COUNTRIES.includes(userCountry || '')) {
    document.documentElement.style.setProperty('--ease-active', 'var(--ease-calm)')
  } else {
    document.documentElement.style.setProperty('--ease-active', 'var(--ease-intent)')
  }
}
