// src/lib/rate-limit.ts
// Server-side rate limiting backed by the auth_attempts table.
// Source spec: docs/AUTH_DESIGN_v1.md §4.3, §11 rule 6 —
// "Rate limits are enforced server-side, not client-side, on every auth attempt."

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AttemptType = 'otp_request' | 'otp_verify' | 'magic_link' | 'line_oauth';

export interface RateCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
}

/**
 * Check rate limits before allowing an OTP request.
 * Limits per docs/AUTH_DESIGN_v1.md §4.3:
 *   - Per phone: 3 OTP requests/hour, 10/24h
 *   - Per IP: 10 OTP requests/hour, 30/24h
 */
export async function checkOtpRequestLimits(
  phoneE164: string,
  ipAddress: string
): Promise<RateCheckResult> {
  const sb = admin();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { count: phoneHourly } = await sb
    .from('auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('phone_e164', phoneE164)
    .eq('attempt_type', 'otp_request')
    .gte('created_at', oneHourAgo);

  if ((phoneHourly ?? 0) >= 3) {
    return { allowed: false, retryAfterSeconds: 3600, reason: 'phone_hourly_limit' };
  }

  const { count: phoneDaily } = await sb
    .from('auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('phone_e164', phoneE164)
    .eq('attempt_type', 'otp_request')
    .gte('created_at', dayAgo);

  if ((phoneDaily ?? 0) >= 10) {
    return { allowed: false, retryAfterSeconds: 86400, reason: 'phone_daily_limit' };
  }

  const { count: ipHourly } = await sb
    .from('auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .eq('attempt_type', 'otp_request')
    .gte('created_at', oneHourAgo);

  if ((ipHourly ?? 0) >= 10) {
    return { allowed: false, retryAfterSeconds: 3600, reason: 'ip_hourly_limit' };
  }

  const { count: ipDaily } = await sb
    .from('auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .eq('attempt_type', 'otp_request')
    .gte('created_at', dayAgo);

  if ((ipDaily ?? 0) >= 30) {
    return { allowed: false, retryAfterSeconds: 86400, reason: 'ip_daily_limit' };
  }

  return { allowed: true };
}

/**
 * Per-phone OTP verify rate limit: 5 attempts per 15 minutes.
 */
export async function checkOtpVerifyLimits(phoneE164: string): Promise<RateCheckResult> {
  const sb = admin();
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count } = await sb
    .from('auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('phone_e164', phoneE164)
    .eq('attempt_type', 'otp_verify')
    .gte('created_at', fifteenMinAgo);

  if ((count ?? 0) >= 5) {
    return { allowed: false, retryAfterSeconds: 900, reason: 'verify_limit' };
  }
  return { allowed: true };
}

/**
 * Log an auth attempt. Always called, regardless of outcome.
 */
export async function logAttempt(params: {
  phoneE164?: string | null;
  email?: string | null;
  ipAddress: string;
  attemptType: AttemptType;
  succeeded: boolean;
}): Promise<void> {
  const sb = admin();
  await sb.from('auth_attempts').insert({
    phone_e164: params.phoneE164 ?? null,
    email: params.email ?? null,
    ip_address: params.ipAddress,
    attempt_type: params.attemptType,
    succeeded: params.succeeded,
  });
}

/**
 * Extract the client IP from a Next.js request.
 * Trusts x-forwarded-for first hop because Vercel sets it.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}
