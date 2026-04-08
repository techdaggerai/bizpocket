import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Mark all unread messages in a conversation as read.
 * Called when the recipient opens the conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Auth check
    const cookieStore = await cookies()
    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversation_id } = await req.json()
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller owns this conversation's org
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No profile' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // Mark all non-owner messages in this conversation as read
    const { error } = await admin
      .from('messages')
      .update({ read_at: now })
      .eq('conversation_id', conversation_id)
      .eq('organization_id', profile.organization_id)
      .is('read_at', null)
      .neq('sender_type', 'owner')

    if (error) {
      console.error('[messages/read]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reset unread count
    await admin
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversation_id)
      .eq('organization_id', profile.organization_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[messages/read]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
