// ═══════════════════════════════════════════════════════════
// Spaceship — Trust Score Event Logger
// Tracks score changes, detects tier upgrades, logs history
// ═══════════════════════════════════════════════════════════

import { detectTier, getTierByName, type Tier } from '@/lib/tier-system'

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
  | 'tier_upgrade'

const EVENT_POINTS: Record<TrustEventType, number> = {
  profile_created: 0, // base 20 already applied
  photo_uploaded: 2,
  phone_added: 2,
  address_added: 2,
  first_invoice: 3,
  invoice_paid: 2,
  first_paid_invoice: 5,
  tax_info_added: 3,
  connection_made: 2,
  referral_published: 3,
  id_verified: 5,
  deal_closed: 4,
  tier_upgrade: 0, // marker event, no direct points
}

export interface TrustEventResult {
  previousScore: number
  newScore: number
  scoreChange: number
  previousTier: Tier
  newTier: Tier
  tierChanged: boolean
}

export async function logTrustEvent(
  supabase: any,
  userId: string,
  eventType: TrustEventType,
  scoreChange?: number
): Promise<TrustEventResult> {
  const points = scoreChange ?? EVENT_POINTS[eventType] ?? 0

  // Get current profile
  const { data: profile, error: profileError } = await supabase
    .from('global_profiles')
    .select('id, trust_score, tier, organization_id')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('Global profile not found — build profile first')
  }

  const previousScore = profile.trust_score || 20
  const previousTier = (profile.tier || 'starter') as Tier

  // Get org data to recalculate tier
  const { data: orgData } = await supabase
    .from('organizations')
    .select('tax_number')
    .eq('id', profile.organization_id)
    .single()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, paid_at')
    .eq('organization_id', profile.organization_id)

  const invoiceCount = invoices?.length || 0
  const hasTaxId = !!(orgData?.tax_number)

  // Recalculate tier with current data
  const newTierInfo = detectTier({
    invoices_sent: invoiceCount,
    has_tax_id: hasTaxId && invoiceCount >= 50,
    has_basic_tax_info: hasTaxId,
  })

  // Calculate new score clamped to tier range
  let newScore = previousScore + points
  newScore = Math.max(newScore, newTierInfo.trustFloor)
  newScore = Math.min(newScore, newTierInfo.trustCeiling)

  const tierChanged = newTierInfo.tier !== previousTier

  // Fix #3: Check write errors on all inserts/updates
  const { error: eventError } = await supabase.from('trust_score_events').insert({
    user_id: userId,
    event_type: eventType,
    score_before: previousScore,
    score_after: newScore,
    score_change: newScore - previousScore,
    tier_before: previousTier,
    tier_after: newTierInfo.tier,
  })

  if (eventError) {
    console.error('[TrustScore] Event insert failed:', eventError)
    throw new Error(`Trust event logging failed: ${eventError.message}`)
  }

  // Update global_profiles
  const { error: updateError } = await supabase
    .from('global_profiles')
    .update({
      trust_score: newScore,
      tier: newTierInfo.tier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[TrustScore] Profile update failed:', updateError)
    throw new Error(`Trust score update failed: ${updateError.message}`)
  }

  // If tier changed, log to tier_history and send notification
  if (tierChanged) {
    const { error: historyError } = await supabase.from('tier_history').insert({
      user_id: userId,
      previous_tier: previousTier,
      new_tier: newTierInfo.tier,
      trust_score_at_change: newScore,
      trigger_event: eventType,
    })

    if (historyError) {
      console.error('[TrustScore] Tier history insert failed:', historyError)
    }

    // Log the tier_upgrade event itself (no extra points)
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      event_type: 'tier_upgrade',
      score_before: newScore,
      score_after: newScore,
      score_change: 0,
      tier_before: previousTier,
      tier_after: newTierInfo.tier,
    })

    // Send in-app notification
    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (profileData) {
      await supabase.from('notifications').insert({
        organization_id: profileData.organization_id,
        type: 'system',
        title: `${newTierInfo.emoji} Tier Upgrade!`,
        body: `Congratulations! You've been upgraded to ${newTierInfo.label}. Your trust score is now ${newScore}.`,
        action_url: '/profile-builder',
      })
    }
  }

  return {
    previousScore,
    newScore,
    scoreChange: newScore - previousScore,
    previousTier,
    newTier: newTierInfo.tier,
    tierChanged,
  }
}
