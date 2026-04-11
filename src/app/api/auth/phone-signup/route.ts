import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/** Strip everything except digits from a phone number */
function phoneDigits(p: string): string {
  return p.replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Reject obviously invalid input (letters, too short, too long)
    const rawDigits = phone.replace(/\D/g, '')
    if (rawDigits.length < 7 || rawDigits.length > 15) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
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

    const digits = phoneDigits(phone) // e.g. "819012345678"
    const fakeEmail = `${digits}@evrywher.io`
    const fakePass = phone

    // ─── Step 1: Check if an existing account already has this phone ───
    // Build phone variants to match different storage formats
    const withPlus = phone.startsWith('+') ? phone : `+${digits}`
    const withoutPlus = digits
    // Domestic format: if starts with country code 81, also try 0 + rest
    const domesticVariant = digits.startsWith('81') ? `0${digits.slice(2)}` : null
    const phoneVariants = [withPlus, withoutPlus, ...(domesticVariant ? [domesticVariant] : [])]

    let existingEmail: string | null = null
    let existingUserId: string | null = null

    // 1a. Check profiles table for matching phone
    for (const variant of phoneVariants) {
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .eq('phone', variant)
        .limit(1)
        .maybeSingle()
      if (profile?.user_id) {
        existingUserId = profile.user_id
        existingEmail = profile.email || null
        break
      }
    }

    // 1b. If not found in profiles, check auth.users user_metadata.phone
    if (!existingUserId) {
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 50 })
      if (userList?.users) {
        const normalizedTarget = phoneDigits(phone)
        const found = userList.users.find((u) => {
          const metaPhone = u.user_metadata?.phone
          if (!metaPhone) return false
          return phoneDigits(metaPhone) === normalizedTarget
        })
        if (found) {
          existingUserId = found.id
          existingEmail = found.email || null
        }
      }
    }

    // ─── Step 2a: Existing account found — sign into it ───
    if (existingUserId && existingEmail) {
      const anonClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // First try: phone-format password (account may have been created via phone flow before)
      const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: existingEmail,
        password: fakePass,
      })

      if (!signInErr && signInData.session) {
        // Ensure phone is stored in profile for future lookups
        await admin.from('profiles').update({ phone: withPlus }).eq('user_id', existingUserId)
        return NextResponse.json({
          success: true,
          userId: signInData.user.id,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        })
      }

      // Second try: the fake email variant (in case they previously signed up via phone
      // but the account email is the fake @evrywher.io format)
      if (existingEmail !== fakeEmail) {
        const { data: signIn2 } = await anonClient.auth.signInWithPassword({
          email: fakeEmail,
          password: fakePass,
        })
        if (signIn2?.session) {
          await admin.from('profiles').update({ phone: withPlus }).eq('user_id', existingUserId)
          return NextResponse.json({
            success: true,
            userId: signIn2.user.id,
            access_token: signIn2.session.access_token,
            refresh_token: signIn2.session.refresh_token,
          })
        }
      }

      // Password doesn't match — only allow reset for phone-created shadow accounts
      if (!existingEmail.toLowerCase().endsWith('@evrywher.io')) {
        // Real email account — cannot force-reset password without verification
        return NextResponse.json(
          { error: 'This phone is linked to an email account. Please sign in with your email and password instead.' },
          { status: 409 }
        )
      }

      // Shadow @evrywher.io account — safe to reset password to phone format
      await admin.auth.admin.updateUserById(existingUserId, {
        password: fakePass,
        user_metadata: { phone: withPlus },
      })

      const { data: signIn3, error: signIn3Err } = await anonClient.auth.signInWithPassword({
        email: existingEmail,
        password: fakePass,
      })

      if (signIn3Err || !signIn3?.session) {
        console.error('[phone-signup] signIn after password reset:', signIn3Err?.message)
        return NextResponse.json({ error: 'Could not sign in. Try again.' }, { status: 500 })
      }

      await admin.from('profiles').update({ phone: withPlus }).eq('user_id', existingUserId)
      return NextResponse.json({
        success: true,
        userId: signIn3.user.id,
        access_token: signIn3.session.access_token,
        refresh_token: signIn3.session.refresh_token,
      })
    }

    // ─── Step 2b: No existing account — create new one (original flow) ───
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password: fakePass,
      email_confirm: true,
      user_metadata: { phone: withPlus, name: name || 'User' },
    })

    // Ignore "already exists" errors (race condition — account may have just been created)
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

    // Store normalized phone in profile so future lookups work
    if (createData?.user) {
      await admin.from('profiles').update({ phone: withPlus }).eq('user_id', createData.user.id)
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
