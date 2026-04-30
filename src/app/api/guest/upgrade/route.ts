import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function verifyGuestToken(guestId: string, chatId: string, guestToken: string): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;

  const expected = createHmac('sha256', key)
    .update(`${guestId}:${chatId}`)
    .digest('hex')
    .slice(0, 32);

  if (guestToken.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(guestToken), Buffer.from(expected));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guestId, name, guestToken, chatId, userId } = body;

    if (!guestId || typeof guestId !== 'string') {
      return NextResponse.json({ error: 'Missing guestId' }, { status: 400 });
    }
    if (!guestToken || !chatId) {
      return NextResponse.json({ error: 'Missing guestToken or chatId' }, { status: 400 });
    }
    if (!verifyGuestToken(guestId, chatId, guestToken)) {
      return NextResponse.json({ error: 'Invalid guest token' }, { status: 403 });
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Verified signup session required' }, { status: 401 });
    }

    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.id !== userId) {
      return NextResponse.json({ error: 'Session does not match signup user' }, { status: 403 });
    }

    const admin = getAdmin();

    const { data: profile } = await admin
      .from('profiles')
      .select('id, organization_id, verified_at')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!profile?.organization_id || !profile.verified_at) {
      return NextResponse.json({ error: 'Verified profile required' }, { status: 403 });
    }

    const { data: guest } = await admin
      .from('guests')
      .select('id, name, invited_by, chat_id, invite_code')
      .eq('id', guestId)
      .eq('chat_id', chatId)
      .is('converted_to', null)
      .maybeSingle();

    if (!guest) {
      return NextResponse.json({ error: 'Guest session not found or already converted' }, { status: 404 });
    }

    const newUserId = authUser.id;
    const newOrgId = profile.organization_id;
    const guestName = name || guest.name;
    const phone = body.phone || authUser.phone || null;
    const email = authUser.email || body.email || null;

    if (guest.chat_id) {
      const { data: inviterConvo } = await admin
        .from('conversations')
        .select('contact_id')
        .eq('id', guest.chat_id)
        .maybeSingle();

      if (inviterConvo?.contact_id) {
        await admin
          .from('contacts')
          .update({
            email,
            phone,
            notes: null,
          })
          .eq('id', inviterConvo.contact_id);
      }
    }

    const inviterId = guest.invited_by;
    if (inviterId) {
      const { data: inviterProfile } = await admin
        .from('profiles')
        .select('full_name, name, email, phone, language, organization_id')
        .eq('user_id', inviterId)
        .maybeSingle();

      if (inviterProfile) {
        const { data: inviterContact } = await admin
          .from('contacts')
          .insert({
            organization_id: newOrgId,
            name: inviterProfile.full_name || inviterProfile.name || 'Contact',
            email: inviterProfile.email,
            phone: inviterProfile.phone || '',
            contact_type: 'friend',
            language: inviterProfile.language || 'en',
          })
          .select('id')
          .single();

        await admin.from('conversations').insert({
          organization_id: newOrgId,
          contact_id: inviterContact?.id || null,
          title: inviterProfile.full_name || inviterProfile.name || 'Chat',
          last_message: 'You signed up! Start chatting.',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        });

        await admin.from('referrals').insert({
          inviter_id: inviterId,
          invitee_id: newUserId,
          trust_awarded: false,
        });
      }
    }

    if (guest.chat_id) {
      await admin
        .from('messages')
        .update({ sender_id: newUserId, sender_name: guestName })
        .eq('sender_id', guestId)
        .eq('conversation_id', guest.chat_id);
    }

    await admin
      .from('guests')
      .update({ converted_to: newUserId })
      .eq('id', guestId);

    return NextResponse.json({
      success: true,
      userId: newUserId,
      chatId: guest.chat_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : err;
    console.error('[guest/upgrade]', message);
    return NextResponse.json({ error: 'Upgrade failed. Please try again.' }, { status: 500 });
  }
}
