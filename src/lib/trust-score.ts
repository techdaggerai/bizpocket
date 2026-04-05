// ═══════════════════════════════════════════════════════════
// Spaceship — Trust Score Engine
// Full recalculation from scratch, event logging, tier upgrades
// ═══════════════════════════════════════════════════════════

import { detectTier, getTierByName, type Tier, type TierInfo } from '@/lib/tier-system'

// ─── Types ───────────────────────────────────────────────

export type TrustEventType =
  | 'profile_created'
  | 'photo_uploaded'
  | 'phone_added'
  | 'address_added'
  | 'first_invoice'
  | 'invoice_paid'
  | 'first_paid_invoice'
  | 'tax_info_added'
  | 'connection_made'
  | 'referral_published'
  | 'id_verified'
  | 'deal_closed'
  | 'corridor_milestone'
  | 'tier_upgrade'

export type BadgeTier = 'none' | 'activity_verified' | 'id_verified'

export interface TrustBreakdown {
  base: number
  photo: number
  phone: number
  address: number
  bio: number
  contacts: number
  messages: number
  invoices: number
  paidFirst: number
  paidRepeat: number
  taxInfo: number
  referrals: number
  idVerified: number
  raw: number
  clamped: number
}

export interface RecalculateResult {
  trustScore: number
  tier: Tier
  tierInfo: TierInfo
  badgeTier: BadgeTier
  breakdown: TrustBreakdown
  previousTier: Tier
  tierChanged: boolean
  nextActions: { action: string; points: number; icon: string }[]
  nextMilestone: { nextTier: string; requirement: string; progress: string } | null
  rawData: {
    invoiceCount: number
    paidInvoices: number
    contactCount: number
    referralCount: number
    hasMessages: boolean
    hasPhoto: boolean
    hasPhone: boolean
    hasAddress: boolean
    hasBio: boolean
    hasTaxInfo: boolean
    idVerified: boolean
    daysSinceSignup: number
    paymentRate: number
  }
}

export interface TrustEventResult {
  previousScore: number
  newScore: number
  scoreChange: number
  previousTier: Tier
  newTier: Tier
  tierChanged: boolean
  badgeTier: BadgeTier
}

// ─── Badge Tier Detection ────────────────────────────────

export function detectBadgeTier(trustScore: number, data: {
  idVerified: boolean
  invoiceCount: number
  daysActive: number
  paymentRate: number
}): BadgeTier {
  const activityMet = trustScore >= 50
    && data.invoiceCount >= 5
    && data.daysActive >= 20
    && data.paymentRate >= 60

  if (data.idVerified && activityMet) return 'id_verified'
  if (activityMet) return 'activity_verified'
  return 'none'
}

// ─── Full Recalculation ──────────────────────────────────

export async function recalculateTrust(
  userId: string,
  supabase: any
): Promise<RecalculateResult> {
  // Get global profile for previous tier
  const { data: globalProfile } = await supabase
    .from('global_profiles')
    .select('tier, trust_score, organization_id')
    .eq('user_id', userId)
    .single()

  if (!globalProfile) {
    throw new Error('Global profile not found — build profile first')
  }

  const orgId = globalProfile.organization_id
  const previousTier = (globalProfile.tier || 'starter') as Tier

  // Pull ALL data points in parallel
  const [
    invoicesRes,
    contactsRes,
    messagesRes,
    profileRes,
    orgRes,
    referralsRes,
    idVerifRes,
  ] = await Promise.all([
    supabase.from('invoices').select('id, status, paid_at').eq('organization_id', orgId),
    supabase.from('contacts').select('id').eq('organization_id', orgId),
    supabase.from('messages').select('id').eq('sender_id', userId).limit(1),
    supabase.from('profiles').select('full_name, avatar_url, created_at').eq('user_id', userId).eq('organization_id', orgId).single(),
    supabase.from('organizations').select('phone, address, tax_number').eq('id', orgId).single(),
    supabase.from('referrals').select('id').eq('inviter_id', userId),
    supabase.from('id_verifications').select('status').eq('user_id', userId).eq('status', 'approved').limit(1),
  ])

  // Fix #3: Check critical reads for errors
  if (profileRes.error || !profileRes.data) {
    throw new Error(`Failed to load profile for trust recalculation: ${profileRes.error?.message || 'not found'}`)
  }
  if (orgRes.error || !orgRes.data) {
    throw new Error(`Failed to load organization for trust recalculation: ${orgRes.error?.message || 'not found'}`)
  }

  const invoices = invoicesRes.data || []
  const invoiceCount = invoices.length
  const paidInvoices = invoices.filter((i: any) => i.paid_at).length
  const contactCount = contactsRes.data?.length || 0
  const hasMessages = (messagesRes.data?.length || 0) > 0
  const referralCount = referralsRes.data?.length || 0
  const idVerified = (idVerifRes.data?.length || 0) > 0

  const prof = profileRes.data
  const org = orgRes.data

  const hasPhoto = !!prof.avatar_url
  const hasPhone = !!org.phone
  const hasAddress = !!org.address
  const hasBio = !!(prof.full_name && prof.full_name.length > 3)
  const hasTaxInfo = !!org.tax_number
  const daysSinceSignup = prof.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(prof.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const paymentRate = invoiceCount > 0 ? Math.round((paidInvoices / invoiceCount) * 100) : 0

  // ─── Score Breakdown (from scratch) ────────────────────
  const breakdown: TrustBreakdown = {
    base: 20,
    photo: hasPhoto ? 2 : 0,
    phone: hasPhone ? 2 : 0,
    address: hasAddress ? 2 : 0,
    bio: hasBio ? 2 : 0,
    contacts: contactCount > 0 ? 2 : 0,
    messages: hasMessages ? 2 : 0,
    invoices: invoiceCount > 0 ? 3 : 0,
    paidFirst: paidInvoices > 0 ? 5 : 0,
    paidRepeat: paidInvoices > 1 ? Math.min((paidInvoices - 1) * 2, 15) : 0,
    taxInfo: hasTaxInfo ? 3 : 0,
    referrals: Math.min(referralCount * 3, 9),
    idVerified: idVerified ? 5 : 0,
    raw: 0,
    clamped: 0,
  }

  breakdown.raw = breakdown.base + breakdown.photo + breakdown.phone
    + breakdown.address + breakdown.bio + breakdown.contacts
    + breakdown.messages + breakdown.invoices + breakdown.paidFirst
    + breakdown.paidRepeat + breakdown.taxInfo + breakdown.referrals
    + breakdown.idVerified

  // Detect tier
  const tierInfo = detectTier({
    invoices_sent: invoiceCount,
    has_tax_id: hasTaxInfo && invoiceCount >= 50,
    has_basic_tax_info: hasTaxInfo,
  })

  // Clamp to tier range
  breakdown.clamped = Math.max(breakdown.raw, tierInfo.trustFloor)
  breakdown.clamped = Math.min(breakdown.clamped, tierInfo.trustCeiling)

  const trustScore = breakdown.clamped
  const tierChanged = tierInfo.tier !== previousTier

  // Badge tier
  const badgeTier = detectBadgeTier(trustScore, {
    idVerified,
    invoiceCount,
    daysActive: daysSinceSignup,
    paymentRate,
  })

  // ─── Update global_profiles ────────────────────────────
  const { error: updateError } = await supabase
    .from('global_profiles')
    .update({
      trust_score: trustScore,
      tier: tierInfo.tier,
      badge_tier: badgeTier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[TrustScore] Profile update failed:', updateError)
    throw new Error(`Trust score update failed: ${updateError.message}`)
  }

  // Note: Tier change side effects (history, notifications) are handled
  // by logTrustEvent to avoid duplicate emissions from concurrent calls.
  // recalculateTrust only updates global_profiles with the new score/tier.

  // ─── Next Actions ──────────────────────────────────────
  const nextActions: { action: string; points: number; icon: string }[] = []
  if (!hasPhoto) nextActions.push({ action: 'Upload a profile photo', points: 2, icon: '\u{1F4F7}' })
  if (!hasPhone) nextActions.push({ action: 'Add your phone number', points: 2, icon: '\u{1F4F1}' })
  if (!hasAddress) nextActions.push({ action: 'Add your business address', points: 2, icon: '\u{1F4CD}' })
  if (invoiceCount === 0) nextActions.push({ action: 'Send your first invoice', points: 3, icon: '\u{1F9FE}' })
  if (paidInvoices === 0 && invoiceCount > 0) nextActions.push({ action: 'Get your first invoice paid', points: 5, icon: '\u{1F4B0}' })
  if (!hasTaxInfo) nextActions.push({ action: 'Add your tax registration', points: 3, icon: '\u{1F3F7}\uFE0F' })
  if (!hasBio) nextActions.push({ action: 'Complete your full name', points: 2, icon: '\u270F\uFE0F' })
  if (!idVerified) nextActions.push({ action: 'Verify your identity', points: 5, icon: '\u{1F6E1}\uFE0F' })

  // Next milestone — progress reflects ALL requirements
  let nextMilestone = null
  if (tierInfo.tier === 'starter') {
    // Growing: 11 invoices OR tax info
    const starterPct = hasTaxInfo ? 100 : Math.round((invoiceCount / 11) * 100)
    nextMilestone = { nextTier: '\u{1F33F} Growing', requirement: 'Send 11 invoices or add tax info', progress: hasTaxInfo ? 'Tax info added' : `${invoiceCount}/11 invoices` }
  } else if (tierInfo.tier === 'growing') {
    // Established: 50 invoices AND tax ID — both must be met
    const invPct = Math.min(100, Math.round((invoiceCount / 50) * 100))
    const taxMet = hasTaxInfo
    const combinedPct = Math.round((invPct + (taxMet ? 100 : 0)) / 2)
    nextMilestone = { nextTier: '\u{1F333} Established', requirement: '50 invoices + verified tax ID', progress: `${invoiceCount}/50 invoices${taxMet ? ' + tax \u2705' : ' (tax needed)'}` }
  }

  return {
    trustScore,
    tier: tierInfo.tier,
    tierInfo,
    badgeTier,
    breakdown,
    previousTier,
    tierChanged,
    nextActions: nextActions.slice(0, 5),
    nextMilestone,
    rawData: {
      invoiceCount, paidInvoices, contactCount, referralCount,
      hasMessages, hasPhoto, hasPhone, hasAddress, hasBio,
      hasTaxInfo, idVerified, daysSinceSignup, paymentRate,
    },
  }
}

// ─── Event Logger (wraps recalculation) ──────────────────

export async function logTrustEvent(
  supabase: any,
  userId: string,
  eventType: TrustEventType,
  metadata?: Record<string, any>
): Promise<TrustEventResult> {
  // Get previous state
  const { data: profile } = await supabase
    .from('global_profiles')
    .select('trust_score, tier')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    throw new Error('Global profile not found — build profile first')
  }

  const previousScore = profile.trust_score || 20
  const previousTier = (profile.tier || 'starter') as Tier

  // Recalculate from scratch
  const result = await recalculateTrust(userId, supabase)

  // Log the event
  const { error: eventError } = await supabase.from('trust_score_events').insert({
    user_id: userId,
    event_type: eventType,
    score_before: previousScore,
    score_after: result.trustScore,
    score_change: result.trustScore - previousScore,
    tier_before: previousTier,
    tier_after: result.tier,
    metadata: metadata || {},
  })

  if (eventError) {
    console.error('[TrustScore] Event insert failed:', eventError)
  }

  // Handle tier change side effects (only place this happens)
  if (result.tierChanged) {
    const TIER_ORDER: Record<Tier, number> = { starter: 0, growing: 1, established: 2 }
    const isUpgrade = TIER_ORDER[result.tier] > TIER_ORDER[previousTier]

    // Log tier history
    await supabase.from('tier_history').insert({
      user_id: userId,
      previous_tier: previousTier,
      new_tier: result.tier,
      trust_score_at_change: result.trustScore,
      trigger_event: eventType,
    })

    // Log tier_upgrade/downgrade marker event
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      event_type: 'tier_upgrade',
      score_before: result.trustScore,
      score_after: result.trustScore,
      score_change: 0,
      tier_before: previousTier,
      tier_after: result.tier,
      metadata: { direction: isUpgrade ? 'upgrade' : 'downgrade' },
    })

    // Send notification (different for upgrade vs downgrade)
    const { data: bizProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (bizProfile) {
      if (isUpgrade) {
        await supabase.from('notifications').insert({
          organization_id: bizProfile.organization_id,
          type: 'system',
          title: `${result.tierInfo.emoji} Tier Upgrade!`,
          body: `Congratulations! You've grown to ${result.tierInfo.label}. Trust score: ${result.trustScore}.`,
          action_url: '/profile/preview',
        })
      } else {
        await supabase.from('notifications').insert({
          organization_id: bizProfile.organization_id,
          type: 'system',
          title: `Tier Changed`,
          body: `Your tier has changed to ${result.tierInfo.label}. Complete actions to grow back.`,
          action_url: '/profile/preview',
        })
      }
    }
  }

  return {
    previousScore,
    newScore: result.trustScore,
    scoreChange: result.trustScore - previousScore,
    previousTier,
    newTier: result.tier,
    tierChanged: result.tierChanged,
    badgeTier: result.badgeTier,
  }
}
