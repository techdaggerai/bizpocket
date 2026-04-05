// ═══════════════════════════════════════════════════════════
// POST /api/profile/build
// Classifies user → builds AI profile → saves to global_profiles
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { classifyUser } from '@/lib/agents/onboarding-classifier'
import { buildProfile } from '@/lib/agents/profile-builder'
import { logTrustEvent } from '@/lib/trust-score'

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

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get org
  let body: { organizationId?: string } = {}
  try {
    body = await request.json()
  } catch {}

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, name, full_name, language, avatar_url, created_at')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found — complete onboarding first' },
      { status: 400 }
    )
  }

  // Fix #1: Only allow building profile for user's own org
  const orgId = profile.organization_id

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (!org) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 400 }
    )
  }

  try {
    // Fix #2: Check if profile already exists BEFORE upsert
    const { data: existingProfile } = await supabase
      .from('global_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const isFirstBuild = !existingProfile

    // Step 1: Classify
    const classification = await classifyUser(user.id, orgId, supabase)

    // Step 2: Build AI profile
    const generated = await buildProfile(
      user.id,
      orgId,
      classification,
      profile,
      org,
      supabase
    )

    // Step 3: Log trust event only on first build
    if (isFirstBuild) {
      await logTrustEvent(supabase, user.id, 'profile_created')
    }

    // Step 4: Fetch the saved profile
    const { data: savedProfile } = await supabase
      .from('global_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      profile: savedProfile,
      classification,
      generated,
    })
  } catch (err: any) {
    console.error('[ProfileBuilder] Build error:', err)
    return NextResponse.json(
      { error: err.message || 'Profile build failed' },
      { status: 500 }
    )
  }
}
