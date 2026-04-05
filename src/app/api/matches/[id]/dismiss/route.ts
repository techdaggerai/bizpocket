// ═══════════════════════════════════════════════════════════
// POST /api/matches/[id]/dismiss
// Dismiss a match — won't appear again
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const matchId = params.id

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

  // Verify match belongs to user
  const { data: match } = await supabase
    .from('ai_matches')
    .select('id')
    .eq('id', matchId)
    .eq('user_id', user.id)
    .single()

  if (!match) {
    return NextResponse.json(
      { error: 'Match not found' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('ai_matches')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Match Dismiss] Error:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss match' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
