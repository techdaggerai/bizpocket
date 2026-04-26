// src/lib/twilio-verify.ts
// Thin wrapper around Twilio Verify v2 API.
// Source spec: docs/AUTH_DESIGN_v1.md §7.

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

function client() {
  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('twilio_verify_not_configured');
  }
  return twilio(accountSid, authToken);
}

export async function sendOtp(phoneE164: string): Promise<{ sent: boolean }> {
  const c = client();
  const verification = await c.verify.v2
    .services(verifyServiceSid!)
    .verifications.create({ to: phoneE164, channel: 'sms' });
  return { sent: verification.status === 'pending' };
}

export async function checkOtp(
  phoneE164: string,
  code: string
): Promise<{ approved: boolean }> {
  const c = client();
  const check = await c.verify.v2
    .services(verifyServiceSid!)
    .verificationChecks.create({ to: phoneE164, code });
  return { approved: check.status === 'approved' };
}
