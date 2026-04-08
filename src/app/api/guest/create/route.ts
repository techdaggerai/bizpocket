import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, inviteCode } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(url, key)

    // ─── Resolve inviter ───
    let inviterId: string | null = null
    let inviterOrgId: string | null = null
    let inviterName = ''

    // 1. invites table
    const { data: invite } = await admin
      .from('invites')
      .select('inviter_id, inviter_org_id')
      .eq('code', inviteCode)
      .single()

    if (invite) {
      inviterId = invite.inviter_id
      inviterOrgId = invite.inviter_org_id
    }

    // 2. permanent_invite_code on profiles
    if (!inviterId) {
      const { data: p } = await admin
        .from('profiles')
        .select('user_id, organization_id')
        .eq('permanent_invite_code', inviteCode)
        .single()
      if (p) {
        inviterId = p.user_id
        inviterOrgId = p.organization_id
      }
    }

    // 3. username on profiles
    if (!inviterId) {
      const { data: p } = await admin
        .from('profiles')
        .select('user_id, organization_id')
        .eq('username', inviteCode)
        .single()
      if (p) {
        inviterId = p.user_id
        inviterOrgId = p.organization_id
      }
    }

    // 4. share_token on global_profiles
    if (!inviterId) {
      const { data: gp } = await admin
        .from('global_profiles')
        .select('user_id')
        .eq('share_token', inviteCode)
        .single()
      if (gp) {
        const { data: p } = await admin
          .from('profiles')
          .select('organization_id')
          .eq('user_id', gp.user_id)
          .single()
        inviterId = gp.user_id
        inviterOrgId = p?.organization_id || null
      }
    }

    if (!inviterId || !inviterOrgId) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Get inviter profile
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('name, full_name, email, language')
      .eq('user_id', inviterId)
      .single()

    inviterName = inviterProfile?.full_name || inviterProfile?.name || 'Someone'

    // ─── Check for existing conversation with same guest name ───
    // Prevents duplicate chat threads when same person opens invite link again
    const { data: existingConvo } = await admin
      .from('conversations')
      .select('id')
      .eq('organization_id', inviterOrgId)
      .eq('title', name.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingConvo) {
      // Reuse existing conversation — don't create a duplicate
      const guestId = crypto.randomUUID()
      const guestToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)

      return NextResponse.json({
        success: true,
        guestId,
        guestToken,
        chatId: existingConvo.id,
        inviterName,
        inviterOrgId,
      })
    }

    // ─── Create guest record ───
    const guestId = crypto.randomUUID()
    const guestToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32)

    try {
      await admin.from('guests').insert({
        id: guestId,
        name: name.trim(),
        invite_code: inviteCode,
        invited_by: inviterId,
      })
    } catch {
      // Table may not exist yet — continue with in-memory guest
    }

    // ─── Create contact in inviter's org ───
    const { data: guestContact } = await admin.from('contacts').insert({
      organization_id: inviterOrgId,
      name: name.trim(),
      contact_type: 'friend',
      category: 'friend',
      language: 'en',
      notes: 'Guest user — pending signup',
    }).select('id').single()

    // ─── Create conversation in inviter's org ───
    const now = new Date().toISOString()
    const welcomeMsg = `${name.trim()} joined the chat`

    const { data: convo } = await admin.from('conversations').insert({
      organization_id: inviterOrgId,
      contact_id: guestContact?.id || null,
      title: name.trim(),
      last_message: welcomeMsg,
      last_message_at: now,
      unread_count: 1,
    }).select('id').single()

    const chatId = convo?.id

    if (!chatId) {
      return NextResponse.json({ error: 'Could not create chat session' }, { status: 500 })
    }

    // Update guest record with chat ID
    try {
      await admin.from('guests').update({ chat_id: chatId }).eq('id', guestId)
    } catch {
      // guests table may not exist
    }

    // ─── Send welcome message ───
    await admin.from('messages').insert({
      conversation_id: chatId,
      organization_id: inviterOrgId,
      sender_type: 'system',
      sender_name: 'Evrywher',
      message: welcomeMsg,
      message_type: 'text',
    })

    return NextResponse.json({
      success: true,
      guestId,
      guestToken,
      chatId,
      inviterName,
      inviterOrgId,
    })
  } catch (err) {
    console.error('[guest/create] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Something went wrong — please try again' },
      { status: 500 }
    )
  }
}
