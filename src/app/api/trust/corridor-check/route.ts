// ═══════════════════════════════════════════════════════════
// POST /api/trust/corridor-check
// Checks if a paid invoice opens a new corridor milestone
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkCorridorMilestone } from '@/lib/corridor-milestones'

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { invoice_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.invoice_id) {
    return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })
  }

  try {
    const milestone = await checkCorridorMilestone(supabase, user.id, body.invoice_id)

    if (milestone) {
      return NextResponse.json({ milestone })
    }

    return NextResponse.json({ milestone: null })
  } catch (err: any) {
    console.error('[CorridorCheck] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Corridor check failed' },
      { status: 500 }
    )
  }
}
