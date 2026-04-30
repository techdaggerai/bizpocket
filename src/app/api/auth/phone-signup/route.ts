import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Phone signup now requires SMS verification. Use the OTP flow instead.',
      code: 'PHONE_SIGNUP_REQUIRES_OTP',
    },
    { status: 410 }
  );
}
