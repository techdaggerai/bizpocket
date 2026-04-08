import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const fakeEmail = `${phone.replace(/\+/g, '')}@evrywher.io`
    const fakePass = phone

    // Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === fakeEmail)

    if (existing) {
      // User exists — return their ID for client-side signIn
      return NextResponse.json({
        success: true,
        userId: existing.id,
        exists: true,
        email: fakeEmail,
      })
    }

    // Create new user via admin API (bypasses rate limits + email verification)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password: fakePass,
      email_confirm: true, // Auto-confirm — no verification email
      user_metadata: { phone, name: name || 'User' },
    })

    if (createErr) {
      console.error('[phone-signup] createUser error:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      exists: false,
      email: fakeEmail,
    })
  } catch (err) {
    console.error('[phone-signup]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
