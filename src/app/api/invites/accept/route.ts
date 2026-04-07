import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  // Auth check — the acceptor
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service role for cross-org writes
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get acceptor profile
  const { data: acceptorProfile } = await admin
    .from('profiles')
    .select('user_id, name, full_name, email, phone, avatar_url, organization_id, language')
    .eq('user_id', user.id)
    .single()

  if (!acceptorProfile?.organization_id) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 400 })
  }

  // Try to find the inviter: 1) invites table, 2) permanent_invite_code, 3) share_token, 4) org ID
  let inviterId: string | null = null
  let inviterOrgId: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inviteRow: any = null

  // 1. Check invites table
  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('code', code)
    .is('used_by', null)
    .single()

  if (invite) {
    inviterId = invite.inviter_id
    inviterOrgId = invite.inviter_org_id
    inviteRow = invite
  }

  // 2. Check permanent_invite_code on profiles
  if (!inviterId) {
    const { data: p } = await admin
      .from('profiles')
      .select('user_id, organization_id')
      .eq('permanent_invite_code', code)
      .single()
    if (p) {
      inviterId = p.user_id
      inviterOrgId = p.organization_id
    }
  }

  // 3. Check username on profiles (vanity URLs)
  if (!inviterId) {
    const { data: p } = await admin
      .from('profiles')
      .select('user_id, organization_id')
      .eq('username', code.toLowerCase())
      .single()
    if (p) {
      inviterId = p.user_id
      inviterOrgId = p.organization_id
    }
  }

  // 4. Check share_token on global_profiles
  if (!inviterId) {
    const { data: gp } = await admin
      .from('global_profiles')
      .select('user_id')
      .eq('share_token', code)
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

  // 5. Try org ID (legacy)
  if (!inviterId) {
    const { data: legacyOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('id', code)
      .single()
    if (legacyOrg) {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('user_id, organization_id')
        .eq('organization_id', legacyOrg.id)
        .eq('role', 'owner')
        .single()
      if (ownerProfile) {
        inviterId = ownerProfile.user_id
        inviterOrgId = ownerProfile.organization_id
      }
    }
  }

  if (!inviterId || !inviterOrgId) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Prevent self-add
  if (inviterId === user.id) {
    return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })
  }

  // Get inviter profile
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('user_id, name, full_name, email, phone, avatar_url, organization_id, language')
    .eq('user_id', inviterId)
    .single()

  if (!inviterProfile) {
    return NextResponse.json({ error: 'Inviter not found' }, { status: 404 })
  }

  // Check if already connected (either direction)
  const { data: existing } = await admin
    .from('contacts')
    .select('id')
    .eq('organization_id', acceptorProfile.organization_id)
    .eq('email', inviterProfile.email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already connected', already_connected: true }, { status: 409 })
  }

  // ═══ Step 1: Create mutual contacts ═══

  // Add inviter as contact in acceptor's org
  const { data: contactInAcceptor } = await admin.from('contacts').insert({
    organization_id: acceptorProfile.organization_id,
    name: inviterProfile.full_name || inviterProfile.name || 'Contact',
    email: inviterProfile.email,
    phone: inviterProfile.phone || '',
    language: inviterProfile.language || 'en',
    contact_type: 'friend',
    category: 'friend',
  }).select('id').single()

  // Add acceptor as contact in inviter's org
  const { data: contactInInviter } = await admin.from('contacts').insert({
    organization_id: inviterOrgId,
    name: acceptorProfile.full_name || acceptorProfile.name || 'Contact',
    email: acceptorProfile.email,
    phone: acceptorProfile.phone || '',
    language: acceptorProfile.language || 'en',
    contact_type: 'friend',
    category: 'friend',
  }).select('id').single()

  // ═══ Step 2: Create conversations BOTH ways ═══

  const now = new Date().toISOString()
  const welcomeMsg = `${acceptorProfile.full_name || acceptorProfile.name || 'Someone'} joined Evrywher! Start chatting.`

  // Conversation in acceptor's org (linked to inviter contact)
  const { data: convoAcceptor } = await admin.from('conversations').insert({
    organization_id: acceptorProfile.organization_id,
    contact_id: contactInAcceptor?.id || null,
    title: inviterProfile.full_name || inviterProfile.name || 'Chat',
    last_message: welcomeMsg,
    last_message_at: now,
    unread_count: 0,
  }).select('id').single()

  // Conversation in inviter's org (linked to acceptor contact)
  const { data: convoInviter } = await admin.from('conversations').insert({
    organization_id: inviterOrgId,
    contact_id: contactInInviter?.id || null,
    title: acceptorProfile.full_name || acceptorProfile.name || 'Chat',
    last_message: welcomeMsg,
    last_message_at: now,
    unread_count: 1,
  }).select('id').single()

  // ═══ Step 3: Send welcome message in both conversations ═══

  if (convoAcceptor) {
    await admin.from('messages').insert({
      conversation_id: convoAcceptor.id,
      organization_id: acceptorProfile.organization_id,
      sender_type: 'system',
      sender_name: 'Evrywher',
      message: welcomeMsg,
      message_type: 'text',
    })
  }

  if (convoInviter) {
    await admin.from('messages').insert({
      conversation_id: convoInviter.id,
      organization_id: inviterOrgId,
      sender_type: 'system',
      sender_name: 'Evrywher',
      message: welcomeMsg,
      message_type: 'text',
    })
  }

  // ═══ Step 4: Mark invite as used ═══

  if (inviteRow) {
    await admin.from('invites').update({
      used_by: user.id,
      used_at: now,
    }).eq('id', inviteRow.id)
  }

  // ═══ Step 5: Create referral record for trust rewards ═══

  const { data: existingRef } = await admin
    .from('referrals')
    .select('id')
    .eq('invitee_id', user.id)
    .maybeSingle()

  if (!existingRef) {
    await admin.from('referrals').insert({
      inviter_id: inviterId,
      invitee_id: user.id,
      trust_awarded: false,
    }).catch(() => {}) // table may not exist yet
  }

  return NextResponse.json({
    success: true,
    inviter: {
      name: inviterProfile.full_name || inviterProfile.name,
      avatar_url: inviterProfile.avatar_url,
    },
    conversation_id: convoAcceptor?.id,
  })
}
