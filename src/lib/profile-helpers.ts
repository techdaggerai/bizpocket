// ═══════════════════════════════════════════════════════════
// Spaceship — Profile Helpers (server-side, service role)
// Public reads for share token lookups — no RLS
// ═══════════════════════════════════════════════════════════

import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Only these fields are safe to expose publicly
const PUBLIC_PROFILE_FIELDS = [
  'user_id',
  'tier',
  'trust_score',
  'title',
  'bio_en',
  'bio_native',
  'bio_ja',
  'tagline',
  'services',
  'operating_corridors',
  'industry_keywords',
  'is_published',
  'share_token',
].join(', ')

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for public profile reads')
  }
  return createClient(url, key)
}

export async function getProfileByShareToken(shareToken: string) {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('global_profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('share_token', shareToken)
    .eq('is_published', true)
    .single()

  if (error || !data) return null
  return data
}

export async function getProfileDisplayData(shareToken: string) {
  const supabase = getServiceClient()

  // Fetch global profile with explicit safe fields + org_id for joins
  const { data: profile, error } = await supabase
    .from('global_profiles')
    .select('user_id, organization_id, tier, trust_score, title, bio_en, bio_native, bio_ja, tagline, services, operating_corridors, industry_keywords, is_published, share_token')
    .eq('share_token', shareToken)
    .eq('is_published', true)
    .single()

  if (error || !profile) return null

  // Get BizPocket profile + org for display name and avatar
  const [profileRes, orgRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, full_name, avatar_url, language, created_at')
      .eq('user_id', profile.user_id)
      .single(),
    supabase
      .from('organizations')
      .select('name, business_type, currency')
      .eq('id', profile.organization_id)
      .single(),
  ])

  const bizProfile = profileRes.data
  const org = orgRes.data

  // Verified activity: only expose rounded/bucketed stats, not exact counts
  const { count: dealCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  const { count: paidCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)
    .not('paid_at', 'is', null)

  const totalDeals = dealCount || 0
  const paidDeals = paidCount || 0

  // Bucket deal count (don't expose exact numbers)
  const dealBucket = totalDeals === 0 ? 0 : totalDeals <= 5 ? 5 : totalDeals <= 20 ? 20 : totalDeals <= 50 ? 50 : 100

  // Bucket payment rate (round to nearest 10)
  const paymentRate = totalDeals > 0 ? Math.round((paidDeals / totalDeals) * 10) * 10 : 0

  const daysSinceSignup = bizProfile?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(bizProfile.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  // Build safe public DTO — strip organization_id before returning
  const { organization_id: _orgId, user_id: _userId, ...safeProfile } = profile

  return {
    ...safeProfile,
    display_name: bizProfile?.full_name || bizProfile?.name || 'Business Professional',
    avatar_url: bizProfile?.avatar_url || null,
    native_language: bizProfile?.language || 'en',
    company_name: org?.name || '',
    business_type: org?.business_type || '',
    currency: org?.currency || 'JPY',
    verified_activity: {
      deals: dealBucket,
      payment_rate: paymentRate,
      languages: profile.operating_corridors?.length
        ? Array.from(new Set(profile.operating_corridors.flatMap((c: any) => [c.from, c.to]))).length
        : 1,
      days_active: daysSinceSignup,
    },
  }
}
