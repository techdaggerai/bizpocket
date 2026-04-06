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

  // Try to find the inviter: 1) invites table, 2) permanent_invite_code, 3) share_token
  let inviterId: string | null = null
  let inviterOrgId: string | null = null
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

  // 3. Check share_token on global_profiles
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

  // Create mutual contact relationship
  // 1. Add inviter as contact in acceptor's org
  await admin.from('contacts').insert({
    organization_id: acceptorProfile.organization_id,
    name: inviterProfile.full_name || inviterProfile.name || 'Contact',
    email: inviterProfile.email,
    phone: inviterProfile.phone || '',
    language: inviterProfile.language || 'en',
    contact_type: 'friend',
    category: 'friend',
  })

  // 2. Add acceptor as contact in inviter's org
  await admin.from('contacts').insert({
    organization_id: inviterOrgId,
    name: acceptorProfile.full_name || acceptorProfile.name || 'Contact',
    email: acceptorProfile.email,
    phone: acceptorProfile.phone || '',
    language: acceptorProfile.language || 'en',
    contact_type: 'friend',
    category: 'friend',
  })

  // 3. Create conversations both ways so they can chat
  const { data: convo } = await admin.from('conversations').insert({
    organization_id: acceptorProfile.organization_id,
    title: inviterProfile.full_name || inviterProfile.name || 'Chat',
  }).select('id').single()

  // Mark invite as used
  if (inviteRow) {
    await admin.from('invites').update({
      used_by: user.id,
      used_at: new Date().toISOString(),
    }).eq('id', inviteRow.id)
  }

  return NextResponse.json({
    success: true,
    inviter: {
      name: inviterProfile.full_name || inviterProfile.name,
      avatar_url: inviterProfile.avatar_url,
    },
    conversation_id: convo?.id,
  })
}
