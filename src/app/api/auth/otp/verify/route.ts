// src/app/api/auth/otp/verify/route.ts
// POST /api/auth/otp/verify — verify an SMS OTP and create a session.
// Source spec: docs/AUTH_DESIGN_v1.md §5.1, §7.3, §10.3.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toE164 } from '@/lib/phone';
import {
  checkOtpVerifyLimits,
  logAttempt,
  getClientIp,
} from '@/lib/rate-limit';
import { checkOtp } from '@/lib/twilio-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  let body: { phone?: string; code?: string; default_country?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'invalid_code_format' }, { status: 400 });
  }

  const result = toE164(body.phone ?? '', (body.default_country as any) ?? 'US');
  if (!result.valid) {
    return NextResponse.json(
      { error: 'invalid_phone', reason: result.reason },
      { status: 400 }
    );
  }
  const phoneE164 = result.e164;

  const limit = await checkOtpVerifyLimits(phoneE164);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', reason: limit.reason },
      {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfterSeconds ?? 900) },
      }
    );
  }

  let approved = false;
  try {
    const r = await checkOtp(phoneE164, code);
    approved = r.approved;
  } catch {
    await logAttempt({
      phoneE164,
      ipAddress: ip,
      attemptType: 'otp_verify',
      succeeded: false,
    }).catch(() => {});
    return NextResponse.json({ error: 'verify_failed' }, { status: 502 });
  }

  await logAttempt({
    phoneE164,
    ipAddress: ip,
    attemptType: 'otp_verify',
    succeeded: approved,
  }).catch(() => {});

  if (!approved) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const sb = admin();
  const nowIso = new Date().toISOString();

  const { data: existing, error: findErr } = await sb
    .from('profiles')
    .select('id, user_id, verified_at')
    .eq('phone_e164', phoneE164)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  let userId: string;

  if (existing) {
    userId = existing.user_id;
    if (existing.verified_at === null) {
      const { error: updErr } = await sb
        .from('profiles')
        .update({ verified_at: nowIso, verification_method: 'sms_otp' })
        .eq('id', existing.id);
      if (updErr) {
        return NextResponse.json({ error: 'db_error' }, { status: 500 });
      }
    }
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      phone: phoneE164,
      phone_confirm: true,
      user_metadata: { verification_method: 'sms_otp' },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: 'auth_create_failed' }, { status: 500 });
    }
    userId = created.user.id;

    const { error: profErr } = await sb.from('profiles').insert({
      user_id: userId,
      phone_e164: phoneE164,
      phone: phoneE164,
      verified_at: nowIso,
      verification_method: 'sms_otp',
    });
    if (profErr) {
      return NextResponse.json({ error: 'profile_create_failed' }, { status: 500 });
    }
  }

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: `${phoneE164.replace('+', '')}@evrywher.io`,
  });

  if (linkErr || !linkData) {
    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
  }

  return NextResponse.json({
    verified: true,
    user_id: userId,
    action_link: linkData.properties?.action_link ?? null,
    hashed_token: linkData.properties?.hashed_token ?? null,
  });
}
