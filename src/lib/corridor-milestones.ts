// ═══════════════════════════════════════════════════════════
// Corridor Milestones — detects first paid invoice on a new
// country corridor and awards trust points
// ═══════════════════════════════════════════════════════════

import { logTrustEvent } from '@/lib/trust-score'

// ─── Currency → Country Code mapping ─────────────────────
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  JPY: 'JP', USD: 'US', EUR: 'DE', GBP: 'GB', INR: 'IN',
  PKR: 'PK', SAR: 'SA', AED: 'AE', BDT: 'BD', NGN: 'NG',
  BRL: 'BR', VND: 'VN', TRY: 'TR', CNY: 'CN', PHP: 'PH', IDR: 'ID',
}

// ─── Country metadata ────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  JP: 'Japan', PK: 'Pakistan', IN: 'India', BD: 'Bangladesh',
  NP: 'Nepal', LK: 'Sri Lanka', AE: 'UAE', SA: 'Saudi Arabia',
  US: 'United States', GB: 'United Kingdom', DE: 'Germany',
  NG: 'Nigeria', BR: 'Brazil', VN: 'Vietnam', TR: 'Turkey',
  CN: 'China', PH: 'Philippines', ID: 'Indonesia', FR: 'France',
  NL: 'Netherlands', ES: 'Spain', KR: 'South Korea', TH: 'Thailand',
}

const COUNTRY_FLAGS: Record<string, string> = {
  JP: '\u{1F1EF}\u{1F1F5}', PK: '\u{1F1F5}\u{1F1F0}',
  IN: '\u{1F1EE}\u{1F1F3}', BD: '\u{1F1E7}\u{1F1E9}',
  NP: '\u{1F1F3}\u{1F1F5}', LK: '\u{1F1F1}\u{1F1F0}',
  AE: '\u{1F1E6}\u{1F1EA}', SA: '\u{1F1F8}\u{1F1E6}',
  US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}', NG: '\u{1F1F3}\u{1F1EC}',
  BR: '\u{1F1E7}\u{1F1F7}', VN: '\u{1F1FB}\u{1F1F3}',
  TR: '\u{1F1F9}\u{1F1F7}', CN: '\u{1F1E8}\u{1F1F3}',
  PH: '\u{1F1F5}\u{1F1ED}', ID: '\u{1F1EE}\u{1F1E9}',
  FR: '\u{1F1EB}\u{1F1F7}', NL: '\u{1F1F3}\u{1F1F1}',
  ES: '\u{1F1EA}\u{1F1F8}', KR: '\u{1F1F0}\u{1F1F7}',
  TH: '\u{1F1F9}\u{1F1ED}',
}

export interface CorridorMilestoneResult {
  from_country: string
  to_country: string
  from_flag: string
  to_flag: string
  label: string
}

/**
 * Check if a paid invoice opens a new corridor milestone.
 * Derives sender country from org currency, recipient from customer/contact data.
 */
export async function checkCorridorMilestone(
  supabase: any,
  userId: string,
  invoiceId: string,
): Promise<CorridorMilestoneResult | null> {
  // Load invoice + org + customer data
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, paid_at, customer_id, organization_id, currency')
    .eq('id', invoiceId)
    .single()

  if (!invoice?.paid_at) return null

  // Get org currency for sender country
  const { data: org } = await supabase
    .from('organizations')
    .select('currency')
    .eq('id', invoice.organization_id)
    .single()

  const senderCountry = CURRENCY_TO_COUNTRY[org?.currency || invoice.currency] || null
  if (!senderCountry) return null

  // Get recipient country from contacts table (has explicit country field)
  let recipientCountry: string | null = null

  if (invoice.customer_id) {
    // Try contacts table first — has a dedicated country field
    const { data: contact } = await supabase
      .from('contacts')
      .select('country')
      .eq('organization_id', invoice.organization_id)
      .eq('contact_type', 'customer')
      .eq('name', (
        await supabase.from('customers').select('name').eq('id', invoice.customer_id).single()
      ).data?.name)
      .limit(1)
      .maybeSingle()

    if (contact?.country) {
      // Country might be a full name or a code — normalize to code
      recipientCountry = normalizeCountry(contact.country)
    }
  }

  // Fallback: check user's operating_corridors for a corridor that matches sender
  if (!recipientCountry) {
    const { data: profile } = await supabase
      .from('global_profiles')
      .select('operating_corridors')
      .eq('user_id', userId)
      .single()

    const corridors = profile?.operating_corridors || []
    // Find a corridor where the "from" side matches the sender country
    for (const c of corridors) {
      const fromCode = normalizeCountry(c.from)
      const toCode = normalizeCountry(c.to)
      if (fromCode === senderCountry && toCode && toCode !== senderCountry) {
        recipientCountry = toCode
        break
      }
    }
  }

  if (!recipientCountry || senderCountry === recipientCountry) return null

  // Check if this corridor already has a milestone
  const { data: existing } = await supabase
    .from('corridor_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('from_country', senderCountry)
    .eq('to_country', recipientCountry)
    .limit(1)

  if (existing && existing.length > 0) return null // already celebrated

  // NEW CORRIDOR! Insert milestone
  const label = `${COUNTRY_NAMES[senderCountry] || senderCountry} \u2194 ${COUNTRY_NAMES[recipientCountry] || recipientCountry}`

  await supabase.from('corridor_milestones').insert({
    user_id: userId,
    from_country: senderCountry,
    to_country: recipientCountry,
    corridor_label: label,
    first_invoice_id: invoiceId,
    first_paid_at: invoice.paid_at,
  })

  // Award trust for corridor milestone
  await logTrustEvent(supabase, userId, 'corridor_milestone', {
    from_country: senderCountry,
    to_country: recipientCountry,
    corridor_label: label,
    invoice_id: invoiceId,
  })

  return {
    from_country: senderCountry,
    to_country: recipientCountry,
    from_flag: COUNTRY_FLAGS[senderCountry] || '\u{1F3F3}\uFE0F',
    to_flag: COUNTRY_FLAGS[recipientCountry] || '\u{1F3F3}\uFE0F',
    label,
  }
}

/** Normalize a country string (name or code) to a 2-letter ISO code */
function normalizeCountry(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Already a 2-letter code
  if (trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed.toUpperCase())) {
    return trimmed.toUpperCase()
  }

  // Reverse lookup from COUNTRY_NAMES
  const lower = trimmed.toLowerCase()
  for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
    if (name.toLowerCase() === lower) return code
  }

  return null
}
