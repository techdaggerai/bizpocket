// ═══════════════════════════════════════════════════════════
// Spaceship — Onboarding Classifier (pure logic, no AI)
// Gathers data from BizPocket tables, calculates tier + trust
// ═══════════════════════════════════════════════════════════

import { detectTier, type Tier, type TierInfo } from '@/lib/tier-system'

export interface ClassificationResult {
  tier: Tier
  tierLabel: string
  tierEmoji: string
  tierColor: string
  trustScore: number
  nextActions: { action: string; points: number; icon: string }[]
  nextMilestone: {
    nextTier: string
    requirement: string
    progress: string
  } | null
  rawData: {
    invoiceCount: number
    paidInvoices: number
    contactCount: number
    hasMessages: boolean
    hasPhoto: boolean
    hasPhone: boolean
    hasAddress: boolean
    hasBio: boolean
    hasTaxInfo: boolean
    daysSinceSignup: number
  }
}

export async function classifyUser(
  userId: string,
  orgId: string,
  supabase: any
): Promise<ClassificationResult> {
  // Gather all data in parallel
  const [invoicesRes, contactsRes, messagesRes, profileRes, orgRes] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('id, status, paid_at')
        .eq('organization_id', orgId),
      supabase
        .from('contacts')
        .select('id')
        .eq('organization_id', orgId),
      supabase
        .from('messages')
        .select('id')
        .eq('sender_id', userId)
        .limit(1),
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single(),
      supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single(),
    ])

  // Fix #4: Check for query errors on critical data
  if (profileRes.error || !profileRes.data) {
    throw new Error(`Failed to load profile: ${profileRes.error?.message || 'not found'}`)
  }
  if (orgRes.error || !orgRes.data) {
    throw new Error(`Failed to load organization: ${orgRes.error?.message || 'not found'}`)
  }

  const invoices = invoicesRes.data || []
  const invoiceCount = invoices.length
  const paidInvoices = invoices.filter((i: any) => i.paid_at).length
  const contactCount = contactsRes.data?.length || 0
  const hasMessages = (messagesRes.data?.length || 0) > 0
  const profile = profileRes.data
  const org = orgRes.data

  const hasPhoto = !!profile.avatar_url
  const hasPhone = !!org.phone
  const hasAddress = !!org.address
  const hasBio = !!(
    profile.full_name && profile.full_name.length > 3
  )
  const hasTaxInfo = !!(org.tax_number)
  const daysSinceSignup = profile.created_at
    ? Math.max(0, Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      ))
    : 0

  // Detect tier
  const tier: TierInfo = detectTier({
    invoices_sent: invoiceCount,
    has_tax_id: hasTaxInfo && invoiceCount >= 50,
    has_basic_tax_info: hasTaxInfo,
  })

  // Calculate trust score
  let trust = 20 // base — everyone starts here
  if (hasPhoto) trust += 2
  if (hasPhone) trust += 2
  if (hasAddress) trust += 2
  if (hasBio) trust += 2
  if (contactCount > 0) trust += 2
  if (hasMessages) trust += 2
  if (invoiceCount > 0) trust += 3
  if (paidInvoices > 0) trust += 5 // first paid invoice = big boost
  if (paidInvoices > 1) trust += Math.min((paidInvoices - 1) * 2, 15)
  if (hasTaxInfo) trust += 3

  // Clamp to tier range
  trust = Math.max(trust, tier.trustFloor)
  trust = Math.min(trust, tier.trustCeiling)

  // Generate next actions (most impactful first)
  const nextActions: { action: string; points: number; icon: string }[] = []
  if (!hasPhoto)
    nextActions.push({
      action: 'Upload a profile photo',
      points: 2,
      icon: '📷',
    })
  if (!hasPhone)
    nextActions.push({
      action: 'Add your phone number',
      points: 2,
      icon: '📱',
    })
  if (!hasAddress)
    nextActions.push({
      action: 'Add your business address',
      points: 2,
      icon: '📍',
    })
  if (invoiceCount === 0)
    nextActions.push({
      action: 'Send your first invoice',
      points: 3,
      icon: '🧾',
    })
  if (paidInvoices === 0 && invoiceCount > 0)
    nextActions.push({
      action: 'Get your first invoice paid',
      points: 5,
      icon: '💰',
    })
  if (!hasTaxInfo)
    nextActions.push({
      action: 'Add your tax registration',
      points: 3,
      icon: '🏷️',
    })
  if (!hasBio)
    nextActions.push({
      action: 'Complete your full name',
      points: 2,
      icon: '✏️',
    })

  // Next milestone
  let nextMilestone = null
  if (tier.tier === 'starter') {
    nextMilestone = {
      nextTier: '🌿 Growing',
      requirement: 'Send 11 invoices or add tax info',
      progress: `${invoiceCount}/11`,
    }
  } else if (tier.tier === 'growing') {
    nextMilestone = {
      nextTier: '🌳 Established',
      requirement: '50 invoices + full tax IDs',
      progress: `${invoiceCount}/50`,
    }
  }

  // Fix #7: matchesPerDay and canShareBizCard are computed by tier-system.ts
  // at the API layer (GET /api/profile/me) where plan + is_published are known.
  // The classifier only returns raw tier + trust data.

  return {
    tier: tier.tier,
    tierLabel: tier.label,
    tierEmoji: tier.emoji,
    tierColor: tier.color,
    trustScore: trust,
    nextActions: nextActions.slice(0, 4),
    nextMilestone,
    rawData: {
      invoiceCount,
      paidInvoices,
      contactCount,
      hasMessages,
      hasPhoto,
      hasPhone,
      hasAddress,
      hasBio,
      hasTaxInfo,
      daysSinceSignup,
    },
  }
}
