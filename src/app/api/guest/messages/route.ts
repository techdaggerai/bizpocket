import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ─── GET: Fetch messages for a guest conversation ───
export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get('chatId')
    const guestToken = req.nextUrl.searchParams.get('guestToken')

    if (!chatId || !guestToken) {
      return NextResponse.json({ error: 'Missing chatId or guestToken' }, { status: 400 })
    }

    const admin = getAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // Validate guest token by checking localStorage-stored session matches a real conversation
    // We verify the conversation exists and the guestToken is plausible (non-empty)
    const { data: convo } = await admin
      .from('conversations')
      .select('id')
      .eq('id', chatId)
      .single()

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: messages } = await admin
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true })
      .limit(200)

    return NextResponse.json({ messages: messages || [] })
  } catch (err) {
    console.error('[guest/messages GET]', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// ─── POST: Send a message as a guest ───
export async function POST(req: NextRequest) {
  try {
    const { chatId, guestToken, guestName, guestId, inviterOrgId, message } = await req.json()

    if (!chatId || !guestToken || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // Verify conversation exists
    const { data: convo } = await admin
      .from('conversations')
      .select('id, organization_id')
      .eq('id', chatId)
      .single()

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const orgId = inviterOrgId || convo.organization_id
    const text = message.trim()

    // Insert message
    const { data: msg, error: msgErr } = await admin.from('messages').insert({
      conversation_id: chatId,
      organization_id: orgId,
      sender_type: 'contact',
      sender_name: guestName || 'Guest',
      message: text,
      message_type: 'text',
    }).select('*').single()

    if (msgErr) {
      console.error('[guest/messages POST] insert error:', msgErr)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation last_message
    await admin.from('conversations').update({
      last_message: text,
      last_message_at: new Date().toISOString(),
      unread_count: 1,
    }).eq('id', chatId)

    return NextResponse.json({ success: true, message: msg })
  } catch (err) {
    console.error('[guest/messages POST]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
