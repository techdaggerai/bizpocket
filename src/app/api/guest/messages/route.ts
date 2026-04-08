import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/** Verify HMAC-signed guest token: token = HMAC(serviceKey, guestId:chatId) */
function verifyGuestToken(guestId: string, chatId: string, guestToken: string): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return false
  const expected = createHmac('sha256', key)
    .update(`${guestId}:${chatId}`)
    .digest('hex')
    .slice(0, 32)
  return guestToken === expected
}

// ─── GET: Fetch messages for a guest conversation ───
export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get('chatId')
    const guestToken = req.nextUrl.searchParams.get('guestToken')
    const guestId = req.nextUrl.searchParams.get('guestId')

    if (!chatId || !guestToken || !guestId) {
      return NextResponse.json({ error: 'Missing chatId, guestId, or guestToken' }, { status: 400 })
    }

    // Verify HMAC token — proves this guest owns this conversation
    if (!verifyGuestToken(guestId, chatId, guestToken)) {
      return NextResponse.json({ error: 'Invalid guest session' }, { status: 403 })
    }

    const admin = getAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
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

    if (!chatId || !guestToken || !guestId || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify HMAC token — proves this guest owns this conversation
    if (!verifyGuestToken(guestId, chatId, guestToken)) {
      return NextResponse.json({ error: 'Invalid guest session' }, { status: 403 })
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

    // Insert message — sender_type hardcoded to 'contact' (cannot be overridden by client)
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
