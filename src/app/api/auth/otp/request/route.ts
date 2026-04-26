// src/app/api/auth/otp/request/route.ts
// POST /api/auth/otp/request — request an SMS OTP for phone signup/login.
// Source spec: docs/AUTH_DESIGN_v1.md §5.1, §7.2.

import { NextResponse } from 'next/server';
import { toE164 } from '@/lib/phone';
import {
  checkOtpRequestLimits,
  logAttempt,
  getClientIp,
} from '@/lib/rate-limit';
import { sendOtp } from '@/lib/twilio-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);

  let body: { phone?: string; default_country?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const result = toE164(body.phone ?? '', (body.default_country as any) ?? 'US');
  if (!result.valid) {
    await logAttempt({
      phoneE164: null,
      ipAddress: ip,
      attemptType: 'otp_request',
      succeeded: false,
    }).catch(() => {});
    return NextResponse.json(
      { error: 'invalid_phone', reason: result.reason },
      { status: 400 }
    );
  }
  const phoneE164 = result.e164;

  const limit = await checkOtpRequestLimits(phoneE164, ip);
  if (!limit.allowed) {
    await logAttempt({
      phoneE164,
      ipAddress: ip,
      attemptType: 'otp_request',
      succeeded: false,
    }).catch(() => {});
    return NextResponse.json(
      { error: 'rate_limited', reason: limit.reason },
      {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfterSeconds ?? 3600) },
      }
    );
  }

  try {
    const { sent } = await sendOtp(phoneE164);
    await logAttempt({
      phoneE164,
      ipAddress: ip,
      attemptType: 'otp_request',
      succeeded: sent,
    }).catch(() => {});
    if (!sent) {
      return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    }
  } catch {
    await logAttempt({
      phoneE164,
      ipAddress: ip,
      attemptType: 'otp_request',
      succeeded: false,
    }).catch(() => {});
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
