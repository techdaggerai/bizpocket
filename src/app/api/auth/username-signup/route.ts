import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Password too long (max 128 characters)' }, { status: 400 })
    }

    const RESERVED = ['admin','system','root','support','evrywher','bizpocket','help','staff','moderator','owner','bot','official']
    const sanitized = username.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!sanitized) {
      return NextResponse.json({ error: 'Username must contain letters or numbers' }, { status: 400 })
    }
    if (sanitized.length > 30) {
      return NextResponse.json({ error: 'Username too long (max 30 characters)' }, { status: 400 })
    }
    if (RESERVED.includes(sanitized)) {
      return NextResponse.json({ error: 'This username is not available' }, { status: 400 })
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

    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9_-]/g, '')}@evrywher.local`

    // Try to create user — if already exists, that's fine (will sign in below)
    const { error: createErr } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { username, name: username },
    })

    // Ignore "already exists" errors
    if (createErr && !createErr.message.includes('already') && !createErr.message.includes('exists') && !createErr.message.includes('unique')) {
      console.error('[username-signup] createUser:', createErr.message)
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    // Sign in using a server-side anon client
    const anonClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (signInErr || !signInData.session) {
      // If user exists but wrong password
      if (signInErr?.message?.includes('Invalid login')) {
        return NextResponse.json({ error: 'Username taken or wrong password' }, { status: 401 })
      }
      console.error('[username-signup] signIn:', signInErr?.message)
      return NextResponse.json({ error: 'Could not sign in. Try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId: signInData.user.id,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    })
  } catch (err) {
    console.error('[username-signup]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
