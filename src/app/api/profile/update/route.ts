// ═══════════════════════════════════════════════════════════
// PUT /api/profile/update
// Partial updates to global_profile, recalculates trust
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { classifyUser } from '@/lib/agents/onboarding-classifier'
import { getTierByName, type Tier } from '@/lib/tier-system'

// Fields users can directly edit
const EDITABLE_FIELDS = [
  'title',
  'bio_en',
  'bio_native',
  'bio_ja',
  'tagline',
  'services',
  'operating_corridors',
  'industry_keywords',
  'is_published',
  'website_url',
  'social_links',
  'company_size',
  'years_in_business',
] as const

export async function PUT(request: Request) {
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

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Check profile exists
  const { data: globalProfile } = await supabase
    .from('global_profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!globalProfile) {
    return NextResponse.json(
      { error: 'No profile found — build one first via POST /api/profile/build' },
      { status: 404 }
    )
  }

  // Filter to only editable fields
  const updates: Record<string, any> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  // Enforce tagline length
  if (updates.tagline && updates.tagline.length > 60) {
    updates.tagline = updates.tagline.slice(0, 57) + '...'
  }

  // Fix #5: Recalculate trust/tier first, then do a single atomic update
  let classification
  try {
    classification = await classifyUser(
      user.id,
      globalProfile.organization_id,
      supabase
    )
  } catch (err: any) {
    console.error('[ProfileUpdate] Classification failed:', err)
    return NextResponse.json(
      { error: `Classification failed: ${err.message}` },
      { status: 500 }
    )
  }

  // Merge content updates + trust/tier into a single write
  updates.trust_score = classification.trustScore
  updates.tier = classification.tier
  updates.updated_at = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('global_profiles')
    .update(updates)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[ProfileUpdate] Error:', updateError)
    return NextResponse.json(
      { error: `Update failed: ${updateError.message}` },
      { status: 500 }
    )
  }

  // Return updated profile
  const { data: updatedProfile } = await supabase
    .from('global_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const tierInfo = getTierByName(
    (updatedProfile?.tier || 'starter') as Tier
  )

  return NextResponse.json({
    profile: updatedProfile,
    tierInfo,
    classification: {
      trustScore: classification.trustScore,
      tier: classification.tier,
      nextActions: classification.nextActions,
      nextMilestone: classification.nextMilestone,
    },
  })
}
