// ═══════════════════════════════════════════════════════════
// POST /api/matches/[id]/connect
// Accept a match — creates Evrywher conversation with icebreaker
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

  // Get the match
  const { data: match, error: matchError } = await supabase
    .from('ai_matches')
    .select('*')
    .eq('id', matchId)
    .eq('user_id', user.id)
    .single()

  if (matchError || !match) {
    return NextResponse.json(
      { error: 'Match not found' },
      { status: 404 }
    )
  }

  if (match.status === 'connected') {
    return NextResponse.json(
      { error: 'Already connected', conversation_id: match.conversation_id },
      { status: 400 }
    )
  }

  // Get user's profile for conversation creation
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('organization_id, name, full_name, language')
    .eq('user_id', user.id)
    .single()

  if (!myProfile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 400 }
    )
  }

  // Get matched user's display name
  const { data: matchedProfile } = await supabase
    .from('profiles')
    .select('name, full_name')
    .eq('user_id', match.matched_user_id)
    .single()

  const matchedName =
    matchedProfile?.full_name || matchedProfile?.name || 'Business Partner'

  try {
    // Create conversation with match metadata
    // Note: BizPocket conversations are org-scoped. The matched user
    // will see this when they check their matches (via match.conversation_id).
    // Full bilateral chat requires both users to have the conversation visible,
    // which is handled by the match status being 'connected' on both sides.
    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .insert({
        organization_id: myProfile.organization_id,
        title: matchedName,
        last_message: match.icebreaker_en || 'Connected via Spaceship Match',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        label: 'spaceship-match',
        label_color: '#4F46E5',
      })
      .select('id')
      .single()

    if (convoError || !conversation) {
      console.error('[Match Connect] Conversation error:', convoError)
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Send icebreaker as first message
    const icebreaker =
      myProfile.language !== 'en' && match.icebreaker_native
        ? match.icebreaker_native
        : match.icebreaker_en || 'Hello! We were matched on Evrywher.'

    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      organization_id: myProfile.organization_id,
      sender_type: 'bot',
      sender_name: 'Spaceship Match',
      message: icebreaker,
      message_type: 'text',
      original_text: icebreaker,
      original_language: myProfile.language || 'en',
    })

    if (msgError) {
      console.error('[Match Connect] Message error:', msgError)
    }

    // Update match status
    const { error: updateError } = await supabase
      .from('ai_matches')
      .update({
        status: 'connected',
        conversation_id: conversation.id,
        connected_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (updateError) {
      console.error('[Match Connect] Update error:', updateError)
    }

    return NextResponse.json({
      conversation_id: conversation.id,
      matched_name: matchedName,
      icebreaker,
    })
  } catch (err: any) {
    console.error('[Match Connect] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Connection failed' },
      { status: 500 }
    )
  }
}
