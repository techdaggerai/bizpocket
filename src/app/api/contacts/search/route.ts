import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { query } = await request.json()
  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: 'Query too short (min 3 characters)' }, { status: 400 })
  }

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

  const q = query.trim().toLowerCase()
  const isPhone = /^[\d\s+\-()]+$/.test(q) && q.replace(/\D/g, '').length >= 6
  const isEmail = q.includes('@')

  let results: any[] = []

  if (isEmail) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, full_name, avatar_url, language, permanent_invite_code')
      .ilike('email', q)
      .neq('user_id', user.id)
      .limit(5)
    results = data || []
  } else if (isPhone) {
    const digits = q.replace(/\D/g, '')
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, full_name, avatar_url, language, permanent_invite_code')
      .ilike('phone', `%${digits}%`)
      .neq('user_id', user.id)
      .limit(5)
    results = data || []
  }

  return NextResponse.json({
    results: results.map(r => ({
      user_id: r.user_id,
      name: r.full_name || r.name || 'User',
      avatar_url: r.avatar_url,
      language: r.language,
      invite_code: r.permanent_invite_code,
    })),
    query_type: isEmail ? 'email' : isPhone ? 'phone' : 'unknown',
  })
}
