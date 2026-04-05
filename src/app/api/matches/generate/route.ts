// ═══════════════════════════════════════════════════════════
// POST /api/matches/generate
// Generate AI matches with rate limiting per tier
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { findMatches } from '@/lib/agents/matchmaker'
import { getMatchLimit, getTierByName, type Tier } from '@/lib/tier-system'

export async function POST() {
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

  // Get user's profile, org, and global profile
  const [profileRes, globalProfileRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('organization_id, created_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('global_profiles')
      .select('tier, trust_score, is_published')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!profileRes.data) {
    return NextResponse.json(
      { error: 'Complete onboarding first' },
      { status: 400 }
    )
  }

  if (!globalProfileRes.data || !globalProfileRes.data.is_published) {
    return NextResponse.json(
      { error: 'Build and publish your global profile first' },
      { status: 400 }
    )
  }

  const gp = globalProfileRes.data
  const tier = (gp.tier || 'starter') as Tier
  const tierInfo = getTierByName(tier)

  // Get org plan
  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', profileRes.data.organization_id)
    .single()

  const plan = org?.plan || 'free'

  // Calculate days since signup
  const daysSinceSignup = profileRes.data.created_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(profileRes.data.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0

  // Rate limit check
  const matchLimit = getMatchLimit(daysSinceSignup, tierInfo, plan)

  // Count today's matches
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: todayCount } = await supabase
    .from('ai_matches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())

  const usedToday = todayCount || 0

  if (matchLimit !== 999 && usedToday >= matchLimit) {
    return NextResponse.json(
      {
        error: 'Daily match limit reached',
        limit: matchLimit,
        used: usedToday,
        tier: tier,
        upgradeHint:
          tier === 'starter'
            ? 'Upgrade to Pro or grow to Growing tier for more matches'
            : 'Upgrade to Pro for unlimited matches',
      },
      { status: 429 }
    )
  }

  try {
    // Generate matches
    const matches = await findMatches(user.id, supabase)

    if (matches.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No new matches found. Check back later as more professionals join.',
      })
    }

    // Insert into ai_matches
    const inserts = matches.map((m) => ({
      user_id: user.id,
      matched_user_id: m.matched_user_id,
      match_score: m.match_score,
      match_reasons: m.match_reasons,
      corridor_tag: m.corridor_tag,
      tier_dynamic: m.tier_dynamic,
      icebreaker_en: m.icebreaker_en,
      icebreaker_native: m.icebreaker_native,
      service_complement_score: m.service_complement_score,
      corridor_relevance_score: m.corridor_relevance_score,
      industry_overlap_score: m.industry_overlap_score,
      language_compatibility_score: m.language_compatibility_score,
      trust_proximity_score: m.trust_proximity_score,
      status: 'pending',
    }))

    const { error: insertError } = await supabase
      .from('ai_matches')
      .insert(inserts)

    if (insertError) {
      console.error('[Matches] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save matches — please try again' },
        { status: 500 }
      )
    }

    // Enrich with display data for response
    const enrichedMatches = matches.map((m) => ({
      ...m,
      display_name: m.candidate.display_name,
      avatar_url: m.candidate.avatar_url,
      title: m.candidate.title,
      tier: m.candidate.tier,
      trust_score: m.candidate.trust_score,
      services: m.candidate.services,
      badge_tier: m.candidate.badge_tier,
    }))

    return NextResponse.json({
      matches: enrichedMatches,
      remaining: matchLimit === 999 ? 'unlimited' : matchLimit - usedToday - 1,
    })
  } catch (err: any) {
    console.error('[Matches] Generation error:', err)
    return NextResponse.json(
      { error: err.message || 'Match generation failed' },
      { status: 500 }
    )
  }
}
