// ═══════════════════════════════════════════════════════════
// GET /api/festivals/active
// Returns active festival for user's country (if any)
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { deriveCountry } from '@/lib/adaptive-glass'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ festival: null })
  }

  // Get user's country from profile or org currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, language')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ festival: null })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('currency')
    .eq('id', profile.organization_id)
    .single()

  const country = deriveCountry(org?.currency)
  if (!country) {
    return NextResponse.json({ festival: null, country: null })
  }

  // Query active festivals for this country
  const today = new Date().toISOString().slice(0, 10)
  const { data: festivals } = await supabase
    .from('festivals')
    .select('name, greeting, suggestion')
    .contains('country_codes', [country])
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    festival: festivals || null,
    country,
  })
}
