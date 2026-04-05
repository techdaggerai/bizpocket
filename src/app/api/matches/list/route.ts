// ═══════════════════════════════════════════════════════════
// GET /api/matches/list
// Returns user's non-dismissed matches, ordered by score
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

  // Fetch non-dismissed matches
  const { data: matches, error } = await supabase
    .from('ai_matches')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'dismissed')
    .order('match_score', { ascending: false })

  if (error) {
    console.error('[Matches] List error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // Enrich with display info
  const matchedUserIds = matches.map((m: any) => m.matched_user_id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name, full_name, avatar_url')
    .in('user_id', matchedUserIds)

  const { data: globalProfiles } = await supabase
    .from('global_profiles')
    .select('user_id, tier, trust_score, title, tagline, services, badge_tier')
    .in('user_id', matchedUserIds)

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.user_id, p])
  )
  const gpMap = new Map(
    (globalProfiles || []).map((p: any) => [p.user_id, p])
  )

  const enriched = matches.map((m: any) => {
    const bp = profileMap.get(m.matched_user_id)
    const gp = gpMap.get(m.matched_user_id)
    return {
      ...m,
      display_name: bp?.full_name || bp?.name || 'Business Professional',
      avatar_url: bp?.avatar_url || null,
      matched_tier: gp?.tier || 'starter',
      matched_trust_score: gp?.trust_score || 0,
      matched_title: gp?.title || null,
      matched_tagline: gp?.tagline || null,
      matched_services: gp?.services || [],
      matched_badge_tier: gp?.badge_tier || 'none',
    }
  })

  return NextResponse.json({ matches: enriched })
}
