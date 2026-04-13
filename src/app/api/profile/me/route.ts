// ═══════════════════════════════════════════════════════════
// GET /api/profile/me
// Returns current user's global profile with tier + trust info
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTierByName, getMatchLimit, canShareBizCard, type Tier } from '@/lib/tier-system'

export async function GET() {
  try {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get global profile
  const { data: globalProfile } = await supabase
    .from('global_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!globalProfile) {
    return NextResponse.json({
      profile: null,
      needsBuild: true,
      message: 'No global profile yet — call POST /api/profile/build',
    })
  }

  // Enrich with tier info
  const tier = (globalProfile.tier || 'starter') as Tier
  const tierInfo = getTierByName(tier)

  // Get profile for daysSinceSignup + plan
  const { data: bizProfile } = await supabase
    .from('profiles')
    .select('created_at, organization_id')
    .eq('user_id', user.id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', bizProfile?.organization_id)
    .single()

  const daysSinceSignup = bizProfile
    ? Math.floor(
        (Date.now() - new Date(bizProfile.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0

  const matchLimit = getMatchLimit(
    daysSinceSignup,
    tierInfo,
    org?.plan || 'free'
  )

  const bizCardShareable = canShareBizCard(
    tier,
    globalProfile.trust_score || 0,
    globalProfile.is_published || false
  )

  return NextResponse.json({
    profile: globalProfile,
    tierInfo: {
      ...tierInfo,
      matchLimit,
      bizCardShareable,
      firstWeekBoost: daysSinceSignup <= 7,
      daysSinceSignup,
    },
  })
  } catch (err) {
    console.error('[profile/me]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
