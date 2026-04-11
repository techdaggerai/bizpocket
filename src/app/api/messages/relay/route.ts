import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/** Strip everything except digits from a phone number */
function normalizePhone(p: string | null | undefined): string {
  if (!p) return ''
  return p.replace(/\D/g, '')
}

/**
 * Message Relay — delivers a sent message to the peer's conversation.
 *
 * When User A sends a message in their org's conversation, this route
 * finds User B's mirrored conversation and inserts a copy there with
 * sender_type='customer' so it appears on the left side of B's chat.
 *
 * Also increments unread_count on the peer conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationId, organizationId, messageText, messageType, senderName, attachmentUrl } = await req.json()

    if (!conversationId || !organizationId || !messageText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // ─── Auth: verify caller is authenticated and owns this org ───
    const cookieStore = await cookies()
    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ },
      },
    })
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller belongs to the claimed organization
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('organization_id, email, phone, full_name, name')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile || callerProfile.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ─── Step 1: Get the conversation's contact ───
    const { data: convo } = await admin
      .from('conversations')
      .select('contact_id, is_bot_chat, is_group')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (!convo?.contact_id || convo.is_bot_chat || convo.is_group) {
      return NextResponse.json({ skipped: true })
    }

    // ─── Step 2: Get the contact's email/phone to find the peer user ───
    const { data: contact } = await admin
      .from('contacts')
      .select('email, phone')
      .eq('id', convo.contact_id)
      .single()

    if (!contact?.email && !contact?.phone) {
      return NextResponse.json({ skipped: true })
    }

    // ─── Step 3: Find the peer user's profile — multiple fallback strategies ───
    let peerProfile: { user_id: string; organization_id: string } | null = null

    // 3a. Exact email match in profiles
    if (contact.email) {
      const { data } = await admin
        .from('profiles')
        .select('user_id, organization_id')
        .eq('email', contact.email)
        .neq('organization_id', organizationId)
        .maybeSingle()
      if (data) peerProfile = data
    }

    // 3b. Exact phone match in profiles
    if (!peerProfile && contact.phone) {
      const { data } = await admin
        .from('profiles')
        .select('user_id, organization_id')
        .eq('phone', contact.phone)
        .neq('organization_id', organizationId)
        .maybeSingle()
      if (data) peerProfile = data
    }

    // 3c. Normalized phone match — try common format variants
    if (!peerProfile && contact.phone) {
      const contactDigits = normalizePhone(contact.phone)
      if (contactDigits.length >= 7) {
        // Build variants: +digits, digits, fake email format
        const variants = [
          `+${contactDigits}`,
          contactDigits,
          // Domestic format: 81XXXXXXXXX → 0XXXXXXXXX
          ...(contactDigits.startsWith('81') ? [`0${contactDigits.slice(2)}`] : []),
          // International: 0XXXXXXXXX → 81XXXXXXXXX or +81XXXXXXXXX
          ...(contactDigits.startsWith('0') ? [contactDigits.slice(1), `+81${contactDigits.slice(1)}`, `81${contactDigits.slice(1)}`] : []),
        ]

        for (const variant of variants) {
          if (peerProfile) break
          const { data } = await admin
            .from('profiles')
            .select('user_id, organization_id')
            .eq('phone', variant)
            .neq('organization_id', organizationId)
            .maybeSingle()
          if (data) peerProfile = data
        }
      }
    }

    // 3d. Check if contact phone matches a phone-based fake email in profiles
    if (!peerProfile && contact.phone) {
      const contactDigits = normalizePhone(contact.phone)
      if (contactDigits.length >= 7) {
        const fakeEmail = `${contactDigits}@evrywher.io`
        const { data } = await admin
          .from('profiles')
          .select('user_id, organization_id')
          .eq('email', fakeEmail)
          .neq('organization_id', organizationId)
          .maybeSingle()
        if (data) peerProfile = data
      }
    }

    // 3e. Last resort: check auth.users user_metadata.phone via admin API
    if (!peerProfile && contact.phone) {
      const contactDigits = normalizePhone(contact.phone)
      if (contactDigits.length >= 7) {
        const { data: userList } = await admin.auth.admin.listUsers({ perPage: 50 })
        if (userList?.users) {
          const found = userList.users.find((u) => {
            const metaPhone = u.user_metadata?.phone
            if (!metaPhone) return false
            return normalizePhone(metaPhone) === contactDigits
          })
          if (found) {
            const { data } = await admin
              .from('profiles')
              .select('user_id, organization_id')
              .eq('user_id', found.id)
              .neq('organization_id', organizationId)
              .maybeSingle()
            if (data) peerProfile = data
          }
        }
      }
    }

    if (!peerProfile) {
      console.warn('[message-relay] peer not found — contact:', { email: contact.email, phone: contact.phone })
      return NextResponse.json({ skipped: true, reason: 'peer_not_found' })
    }

    // ─── Step 4: Find (or create) the contact in peer's org for the sender ───
    let peerContactId: string | null = null

    if (callerProfile.email) {
      const { data } = await admin
        .from('contacts')
        .select('id')
        .eq('organization_id', peerProfile.organization_id)
        .eq('email', callerProfile.email)
        .maybeSingle()
      if (data) peerContactId = data.id
    }

    if (!peerContactId && callerProfile.phone) {
      // Try exact match first
      const { data } = await admin
        .from('contacts')
        .select('id')
        .eq('organization_id', peerProfile.organization_id)
        .eq('phone', callerProfile.phone)
        .maybeSingle()
      if (data) peerContactId = data.id

      // Try normalized phone variants
      if (!peerContactId) {
        const callerDigits = normalizePhone(callerProfile.phone)
        const variants = [
          `+${callerDigits}`,
          callerDigits,
          ...(callerDigits.startsWith('81') ? [`0${callerDigits.slice(2)}`] : []),
          ...(callerDigits.startsWith('0') ? [`+81${callerDigits.slice(1)}`] : []),
        ].filter(v => v !== callerProfile.phone) // skip the one we already tried
        for (const variant of variants) {
          if (peerContactId) break
          const { data: d } = await admin
            .from('contacts')
            .select('id')
            .eq('organization_id', peerProfile.organization_id)
            .eq('phone', variant)
            .maybeSingle()
          if (d) peerContactId = d.id
        }
      }
    }

    // If no contact exists in peer's org, create one
    if (!peerContactId) {
      const { data: newContact } = await admin.from('contacts').insert({
        organization_id: peerProfile.organization_id,
        name: callerProfile.full_name || callerProfile.name || senderName || 'Contact',
        email: callerProfile.email || null,
        phone: callerProfile.phone || null,
        contact_type: 'friend',
        language: 'en',
      }).select('id').single()
      if (!newContact) return NextResponse.json({ skipped: true })
      peerContactId = newContact.id
    }

    // ─── Step 5: Find (or create) the peer's conversation for this contact ───
    const now = new Date().toISOString()

    let peerConvoId: string | null = null

    const { data: peerConvo } = await admin
      .from('conversations')
      .select('id')
      .eq('organization_id', peerProfile.organization_id)
      .eq('contact_id', peerContactId)
      .single()

    if (peerConvo) {
      peerConvoId = peerConvo.id
    } else {
      // Create the conversation in peer's org
      const { data: newConvo } = await admin.from('conversations').insert({
        organization_id: peerProfile.organization_id,
        contact_id: peerContactId,
        title: callerProfile.full_name || callerProfile.name || senderName || 'Chat',
        last_message: messageText,
        last_message_at: now,
        unread_count: 0,
      }).select('id').single()
      if (!newConvo) return NextResponse.json({ skipped: true })
      peerConvoId = newConvo.id
    }

    // ─── Step 6: Insert the relayed message in peer's conversation ───
    await admin.from('messages').insert({
      conversation_id: peerConvoId,
      organization_id: peerProfile.organization_id,
      sender_type: 'customer',
      sender_name: senderName || 'Contact',
      message: messageText,
      message_type: messageType || 'text',
      original_text: messageText,
      attachment_url: attachmentUrl || null,
    })

    // ─── Step 7: Update peer conversation — last message + atomic-ish unread increment ───
    // Re-read unread_count immediately before write to minimize race window
    const { data: freshConvo } = await admin
      .from('conversations')
      .select('unread_count')
      .eq('id', peerConvoId)
      .single()

    await admin.from('conversations').update({
      last_message: messageText,
      last_message_at: now,
      unread_count: ((freshConvo?.unread_count || 0) + 1),
    }).eq('id', peerConvoId)

    return NextResponse.json({ relayed: true, peerConversationId: peerConvoId })
  } catch (err) {
    console.error('[message-relay]', err)
    return NextResponse.json({ error: 'Relay failed' }, { status: 500 })
  }
}
