import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Server-side price ID map — NEVER accept price IDs from the client
const PRICE_MAP: Record<string, Record<string, string>> = {
  bizpocket: {
    pro: 'price_1TIVgEKiugpuK1mjPOxx3pen',
    business: 'price_1TIVgrKiugpuK1mjOgdLfnfB',
  },
  evrywher: {
    pro: 'price_1TIVhTKiugpuK1mjR0zT4iOj',
    business: 'price_1TIVi6KiugpuK1mjfa6126uy',
  },
}

// Allowlisted origins — reject anything else
const ALLOWED_ORIGINS: Record<string, { brand: 'bizpocket' | 'evrywher'; url: string }> = {
  'www.bizpocket.io':   { brand: 'bizpocket', url: 'https://www.bizpocket.io' },
  'bizpocket.io':       { brand: 'bizpocket', url: 'https://bizpocket.io' },
  'evrywher.io':        { brand: 'evrywher',  url: 'https://evrywher.io' },
  'www.evrywher.io':    { brand: 'evrywher',  url: 'https://www.evrywher.io' },
  'pocketchat.co':      { brand: 'evrywher',  url: 'https://pocketchat.co' },
  'www.pocketchat.co':  { brand: 'evrywher',  url: 'https://pocketchat.co' },
  'localhost':          { brand: 'bizpocket', url: 'http://localhost:3000' },
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

  const body = await request.json()
  const tier = body.tier as string

  // Validate tier — only 'pro' or 'business' allowed
  if (tier !== 'pro' && tier !== 'business') {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Get user's profile — enforce owner role server-side
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
    .select('id, stripe_customer_id, name, signup_source')
    .eq('id', profile.organization_id)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Determine brand from allowlisted origin — reject unknown origins
  const rawOrigin = request.headers.get('origin') || ''
  let originHost: string
  try {
    originHost = new URL(rawOrigin).hostname
  } catch {
    originHost = ''
  }
  // Also check signup_source as fallback for brand detection
  const allowedOrigin = ALLOWED_ORIGINS[originHost]
  const brand = allowedOrigin?.brand || (org.signup_source === 'pocketchat' ? 'evrywher' : 'bizpocket')
  const safeOrigin = allowedOrigin?.url || 'https://www.bizpocket.io'
  const priceId = PRICE_MAP[brand][tier]

  let customerId = org.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.name,
      metadata: {
        organization_id: org.id,
        user_id: user.id,
      },
    })
    customerId = customer.id

    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${safeOrigin}/settings/subscription?success=true`,
    cancel_url: `${safeOrigin}/settings/subscription?canceled=true`,
    metadata: {
      organization_id: org.id,
      user_id: user.id,
      tier,
    },
    subscription_data: {
      metadata: {
        organization_id: org.id,
        tier,
      },
    },
  })

  return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
