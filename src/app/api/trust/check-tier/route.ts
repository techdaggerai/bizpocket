// ═══════════════════════════════════════════════════════════
// POST /api/trust/check-tier
// Recalculates trust score, detects tier upgrades
// Call after: invoice sent/paid, profile updated, tax added
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { recalculateTrust } from '@/lib/trust-score'

export async function POST(request: Request) {
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

  // Check if user has a global profile
  const { data: globalProfile } = await supabase
    .from('global_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!globalProfile) {
    return NextResponse.json({
      tierChanged: false,
      message: 'No global profile — build one first at /profile/build',
    })
  }

  try {
    const result = await recalculateTrust(user.id, supabase)

    return NextResponse.json({
      tierChanged: result.tierChanged,
      oldTier: result.previousTier,
      newTier: result.tier,
      newScore: result.trustScore,
      badgeTier: result.badgeTier,
      breakdown: result.breakdown,
      nextActions: result.nextActions,
      nextMilestone: result.nextMilestone,
    })
  } catch (err: any) {
    console.error('[CheckTier] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Tier check failed' },
      { status: 500 }
    )
  }
}
