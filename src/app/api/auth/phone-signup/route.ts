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
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const fakeEmail = `${phone.replace(/\+/g, '')}@evrywher.io`
    const fakePass = phone

    // Try to create user — if already exists, that's fine
    const { error: createErr } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password: fakePass,
      email_confirm: true,
      user_metadata: { phone, name: name || 'User' },
    })

    // Ignore "already exists" errors
    if (createErr && !createErr.message.includes('already') && !createErr.message.includes('exists') && !createErr.message.includes('unique')) {
      console.error('[phone-signup] createUser:', createErr.message)
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    // Sign in using a server-side anon client — returns real session tokens
    const anonClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: fakeEmail,
      password: fakePass,
    })

    if (signInErr || !signInData.session) {
      console.error('[phone-signup] signIn:', signInErr?.message)
      return NextResponse.json({ error: 'Could not sign in. Try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId: signInData.user.id,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    })
  } catch (err) {
    console.error('[phone-signup]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
