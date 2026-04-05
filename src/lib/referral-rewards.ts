// ═══════════════════════════════════════════════════════════
// Spaceship — Referral Trust Rewards
// Awards +15 trust to both inviter and invitee on publish
// ═══════════════════════════════════════════════════════════

import { logTrustEvent } from '@/lib/trust-score'

const REFERRAL_TRUST_BONUS = 15

export async function checkAndAwardReferralTrust(
  userId: string,
  supabase: any
): Promise<{ awarded: boolean; inviterId?: string }> {
  // Atomically claim the referral reward using conditional update (CAS)
  // This prevents double-award from concurrent requests
  const { data: claimed, error: claimError } = await supabase
    .from('referrals')
    .update({
      trust_awarded: true,
      published_at: new Date().toISOString(),
    })
    .eq('invitee_id', userId)
    .eq('trust_awarded', false)
    .select('id, inviter_id')
    .single()

  if (claimError || !claimed) {
    // No unclaimed referral found (or already awarded)
    return { awarded: false }
  }

  const referral = claimed

  // Check if inviter has a global profile (needed for trust events)
  const { data: inviterProfile } = await supabase
    .from('global_profiles')
    .select('id')
    .eq('user_id', referral.inviter_id)
    .single()

  if (!inviterProfile) {
    // Rollback claim if inviter doesn't have a profile
    await supabase
      .from('referrals')
      .update({ trust_awarded: false, published_at: null })
      .eq('id', referral.id)
    return { awarded: false }
  }

  try {
    // Award trust to both sides via recalculation
    // The referrals count in trust-score.ts will pick up the new referral
    await logTrustEvent(supabase, referral.inviter_id, 'referral_published', {
      invitee_id: userId,
    })

    await logTrustEvent(supabase, userId, 'referral_published', {
      inviter_id: referral.inviter_id,
    })

    // Get invitee name for notification
    const { data: inviteeProfile } = await supabase
      .from('profiles')
      .select('name, full_name, organization_id')
      .eq('user_id', userId)
      .single()

    const inviteeName = inviteeProfile?.full_name || inviteeProfile?.name || 'Someone'

    // Get inviter's org for notification
    const { data: inviterBizProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', referral.inviter_id)
      .single()

    // Notify inviter
    if (inviterBizProfile) {
      await supabase.from('notifications').insert({
        organization_id: inviterBizProfile.organization_id,
        type: 'system',
        title: '\u{1F389} Referral Reward!',
        body: `${inviteeName} published their profile! You both earned +${REFERRAL_TRUST_BONUS} Trust.`,
        action_url: '/invite',
      })
    }

    return { awarded: true, inviterId: referral.inviter_id }
  } catch (err) {
    console.error('[ReferralRewards] Award error:', err)
    return { awarded: false }
  }
}
