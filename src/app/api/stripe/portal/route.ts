import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(request: Request) {
  try {
  const stripe = getStripe()
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get org from user's profile — enforce owner role server-side
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only the account owner can manage subscriptions' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', profile.organization_id)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  // Allowlisted return URLs — reject unknown origins
  const ALLOWED_RETURNS: Record<string, string> = {
    'www.bizpocket.io': 'https://www.bizpocket.io',
    'bizpocket.io': 'https://bizpocket.io',
    'evrywher.io': 'https://evrywher.io',
    'www.evrywher.io': 'https://www.evrywher.io',
    'pocketchat.co': 'https://pocketchat.co',
    'www.pocketchat.co': 'https://pocketchat.co',
    'localhost': 'http://localhost:3000',
  }
  const rawOrigin = request.headers.get('origin') || ''
  let originHost = ''
  try { originHost = new URL(rawOrigin).hostname } catch {}
  const safeOrigin = ALLOWED_RETURNS[originHost] || 'https://www.bizpocket.io'

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${safeOrigin}/settings/subscription`,
  })

  return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/portal]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
