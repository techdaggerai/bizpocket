import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Username-only signup is disabled. Use phone OTP or email magic link.',
      code: 'USERNAME_SIGNUP_DISABLED',
    },
    { status: 410 }
  );
}
