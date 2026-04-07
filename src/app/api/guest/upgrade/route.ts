import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { guestId, email, password, name } = await request.json()

  if (!guestId || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ─── Get guest record ───
  const { data: guest } = await admin
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .is('converted_to', null)
    .single()
    .catch(() => ({ data: null })) as { data: { id: string; name: string; invited_by: string; chat_id: string; invite_code: string } | null }

  if (!guest) {
    return NextResponse.json({ error: 'Guest session not found or already converted' }, { status: 404 })
  }

  // ─── Create real auth user ───
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || guest.name },
  })

  if (authError || !authData.user) {
    const msg = authError?.message || 'Failed to create account'
    if (msg.includes('already') || msg.includes('exists')) {
      return NextResponse.json({ error: 'An account with this email already exists. Log in instead.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const newUserId = authData.user.id
  const guestName = name || guest.name

  // ─── Create org + profile ───
  const { data: org } = await admin.from('organizations').insert({
    name: 'My Evrywher',
    created_by: newUserId,
    plan: 'free',
    language: 'en',
    currency: 'JPY',
    signup_source: 'pocketchat',
  }).select('id').single()

  if (!org) {
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  // Generate username from name
  const username = await generateUsername(admin, guestName)

  await admin.from('profiles').insert({
    user_id: newUserId,
    organization_id: org.id,
    role: 'owner',
    name: guestName,
    full_name: guestName,
    email,
    language: 'en',
    onboarding_completed: true,
    username,
  })

  // ─── Create mutual contacts ───
  const inviterId = guest.invited_by
  if (inviterId) {
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('full_name, name, email, language, organization_id')
      .eq('user_id', inviterId)
      .single()

    if (inviterProfile) {
      // Add inviter as contact for new user
      const { data: inviterContact } = await admin.from('contacts').insert({
        organization_id: org.id,
        name: inviterProfile.full_name || inviterProfile.name || 'Contact',
        email: inviterProfile.email,
        contact_type: 'friend',
        language: inviterProfile.language || 'en',
      }).select('id').single()

      // Create conversation in new user's org
      const { data: newConvo } = await admin.from('conversations').insert({
        organization_id: org.id,
        contact_id: inviterContact?.id || null,
        title: inviterProfile.full_name || inviterProfile.name || 'Chat',
        last_message: 'You signed up! Start chatting.',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      }).select('id').single()

      // Update the guest contact in inviter's org to remove "Guest" note
      if (guest.chat_id) {
        // Find the guest contact in inviter's conversations and update
        const { data: inviterConvo } = await admin
          .from('conversations')
          .select('contact_id')
          .eq('id', guest.chat_id)
          .single()

        if (inviterConvo?.contact_id) {
          await admin.from('contacts').update({
            email,
            notes: null,
          }).eq('id', inviterConvo.contact_id)
        }
      }

      // Create referral
      await admin.from('referrals').insert({
        inviter_id: inviterId,
        invitee_id: newUserId,
        trust_awarded: false,
      }).catch(() => {})
    }
  }

  // ─── Mark guest as converted ───
  await admin.from('guests').update({
    converted_to: newUserId,
  }).eq('id', guestId).catch(() => {})

  return NextResponse.json({
    success: true,
    userId: newUserId,
    chatId: guest.chat_id,
  })
}

async function generateUsername(supabase: ReturnType<typeof createClient>, fullName: string): Promise<string> {
  const parts = fullName.trim().split(/\s+/).map(p => p.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
  if (!parts.length) return `user-${Date.now().toString(36)}`

  const candidates = [
    parts[0],
    parts.length > 1 ? `${parts[0]}-${parts[1]}` : null,
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).single()
    if (!data) return candidate
  }

  for (let i = 1; i < 100; i++) {
    const candidate = `${candidates[candidates.length - 1]}-${i}`
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).single()
    if (!data) return candidate
  }

  return `${parts[0]}-${Date.now().toString(36)}`
}
