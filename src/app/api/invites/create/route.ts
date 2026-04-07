import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getBrandFromHost } from '@/lib/brand'

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
    .select('organization_id, permanent_invite_code, username, full_name, name')
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

  // Ensure user has a username (for vanity URLs)
  let username = profile.username
  if (!username) {
    username = await generateUsername(supabase, profile.full_name || profile.name || user.email?.split('@')[0] || 'user')
    await supabase
      .from('profiles')
      .update({ username })
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

  const headersList = await headers()
  const host = headersList.get('host') || ''
  const brand = getBrandFromHost(host)
  const baseUrl = brand === 'evrywher' ? 'https://evrywher.io' : 'https://www.bizpocket.io'
  return NextResponse.json({
    code,
    invite_url: `${baseUrl}/invite/${code}`,
    permanent_code: permanentCode,
    permanent_url: `${baseUrl}/invite/${permanentCode}`,
    username,
    vanity_url: `${baseUrl}/c/${username}`,
  })
}

async function generateUsername(supabase: ReturnType<typeof createServerClient>, fullName: string): Promise<string> {
  const parts = fullName.trim().split(/\s+/).map(p => p.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
  if (!parts.length) return `user-${Date.now().toString(36)}`

  const candidates = [
    parts[0],
    parts.length > 1 ? `${parts[0]}-${parts[1]}` : null,
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).single()
    if (!data) return candidate
  }

  for (let i = 1; i < 100; i++) {
    const candidate = `${candidates[candidates.length - 1]}-${i}`
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).single()
    if (!data) return candidate
  }

  return `${parts[0]}-${Date.now().toString(36)}`
}
