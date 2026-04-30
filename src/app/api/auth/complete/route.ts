import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient, getAuthenticatedUser } from '@/lib/api-auth';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function profileEmail(userEmail: string | undefined, phone: string | undefined) {
  if (userEmail) return userEmail;
  if (phone) return `${digitsOnly(phone)}@phone.evrywher.local`;
  return `user-${randomUUID()}@evrywher.local`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const source = body.source === 'bizpocket' ? 'bizpocket' : 'pocketchat';
    const phone = typeof body.phone === 'string' ? body.phone : user.phone || undefined;
    const email = typeof user.email === 'string' ? user.email : undefined;
    const verifiedAt =
      user.phone_confirmed_at ||
      user.email_confirmed_at ||
      user.confirmed_at ||
      null;

    if (!verifiedAt) {
      return NextResponse.json({ error: 'Verified Supabase session required' }, { status: 403 });
    }

    const verificationMethod = user.phone || phone ? 'sms_otp' : 'email_magic_link';
    const userName =
      body.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email?.split('@')[0] ||
      'Owner';
    const language = (user.user_metadata?.preferred_language || body.language || 'en').substring(0, 5);
    const supabase = createServiceClient();

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingProfile) {
      const profileUpdate: Record<string, string | null> = {
        verified_at: verifiedAt,
        verification_method: verificationMethod,
        email: profileEmail(email, phone),
      };
      if (phone) {
        profileUpdate.phone = phone;
        profileUpdate.phone_e164 = phone;
      }

      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', existingProfile.id);

      return NextResponse.json({ success: true, userId: user.id, profileId: existingProfile.id });
    }

    const trialEnd = source === 'pocketchat' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: source === 'pocketchat' ? 'My Evrywher' : 'My Business',
        created_by: user.id,
        plan: 'free',
        language,
        currency: 'JPY',
        signup_source: source,
        trial_ends_at: trialEnd,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'owner',
        name: userName,
        full_name: userName,
        email: profileEmail(email, phone),
        phone: phone || null,
        phone_e164: phone || null,
        language,
        onboarding_completed: source === 'pocketchat',
        verified_at: verifiedAt,
        verification_method: verificationMethod,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: user.id, profileId: profile.id });
  } catch (error) {
    console.error('[auth/complete]', error);
    return NextResponse.json({ error: 'Could not complete signup' }, { status: 500 });
  }
}
