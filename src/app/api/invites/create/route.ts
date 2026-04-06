import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, permanent_invite_code')
    .eq('user_id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  // Ensure user has a permanent invite code (for QR)
  let permanentCode = profile.permanent_invite_code
  if (!permanentCode) {
    permanentCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    await supabase
      .from('profiles')
      .update({ permanent_invite_code: permanentCode })
      .eq('user_id', user.id)
  }

  // Create a one-time invite link
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const { error } = await supabase.from('invites').insert({
    inviter_id: user.id,
    inviter_org_id: profile.organization_id,
    code,
    invite_type: 'contact',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://evrywher.io'
  return NextResponse.json({
    code,
    invite_url: `${baseUrl}/invite/${code}`,
    permanent_code: permanentCode,
    permanent_url: `${baseUrl}/invite/${permanentCode}`,
  })
}
