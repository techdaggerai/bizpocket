// ═══════════════════════════════════════════════════════════
// POST /api/trust/log-event
// Logs a trust-earning event with dedup for one-time events,
// then recalculates trust score and detects tier changes.
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logTrustEvent, type TrustEventType } from '@/lib/trust-score'

// Events that can only be awarded once per user
const ONE_TIME_EVENTS: TrustEventType[] = [
  'first_invoice',
  'first_paid_invoice',
  'photo_uploaded',
  'phone_added',
  'address_added',
  'tax_info_added',
  'profile_created',
]

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

  let body: { event_type: TrustEventType; metadata?: Record<string, any> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event_type, metadata } = body
  if (!event_type) {
    return NextResponse.json({ error: 'event_type required' }, { status: 400 })
  }

  // ─── Dedup: skip one-time events that already exist ─────
  if (ONE_TIME_EVENTS.includes(event_type)) {
    const { data: existing } = await supabase
      .from('trust_score_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', event_type)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        skipped: true,
        reason: `${event_type} already awarded`,
      })
    }
  }

  // ─── Check global profile exists ──────────────────────
  const { data: globalProfile } = await supabase
    .from('global_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!globalProfile) {
    return NextResponse.json({
      skipped: true,
      reason: 'No global profile — build one first',
    })
  }

  // ─── Log the event + recalculate ──────────────────────
  try {
    const result = await logTrustEvent(supabase, user.id, event_type, metadata)

    return NextResponse.json({
      skipped: false,
      previousScore: result.previousScore,
      newScore: result.newScore,
      scoreChange: result.scoreChange,
      previousTier: result.previousTier,
      newTier: result.newTier,
      tierChanged: result.tierChanged,
      badgeTier: result.badgeTier,
    })
  } catch (err: any) {
    console.error('[TrustLogEvent] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to log trust event' },
      { status: 500 }
    )
  }
}
