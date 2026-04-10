import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Extract subscription ID from Stripe v21 Invoice object
function getSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return undefined
  return typeof sub === 'string' ? sub : sub.id
}

// All 4 price IDs — BizPocket + Evrywher
const PRICE_TO_PLAN: Record<string, 'pro' | 'business'> = {
  // BizPocket
  'price_1TIVgEKiugpuK1mjPOxx3pen': 'pro',
  'price_1TIVgrKiugpuK1mjOgdLfnfB': 'business',
  // Evrywher
  'price_1TIVhTKiugpuK1mjR0zT4iOj': 'pro',
  'price_1TIVi6KiugpuK1mjfa6126uy': 'business',
}

function planFromPriceId(priceId: string): 'pro' | 'business' | null {
  return PRICE_TO_PLAN[priceId] || null
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const supabase = getSupabase()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organization_id
      const tier = session.metadata?.tier as 'pro' | 'business' | undefined
      if (!orgId) break

      const sub = session.subscription
      const subscriptionId = typeof sub === 'string' ? sub : sub?.id || null

      const cust = session.customer
      const customerId = typeof cust === 'string' ? cust : cust?.id || null

      await supabase
        .from('organizations')
        .update({
          plan: tier || 'pro',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
        })
        .eq('id', orgId)

      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata.organization_id
      if (!orgId) break

      const priceId = subscription.items.data[0]?.price.id
      const plan = planFromPriceId(priceId)
      if (!plan) {
        console.error('[Stripe Webhook] Unknown price ID, skipping plan update:', priceId)
        break
      }
      const isActive = ['active', 'trialing'].includes(subscription.status)

      await supabase
        .from('organizations')
        .update({
          plan: isActive ? plan : 'free',
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
        })
        .eq('id', orgId)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata.organization_id
      if (!orgId) break

      await supabase
        .from('organizations')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
          subscription_status: 'canceled',
        })
        .eq('id', orgId)

      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getSubscriptionId(invoice)

      if (!subscriptionId || invoice.billing_reason === 'subscription_create') break

      const { data: org } = await supabase
        .from('organizations')
        .select('id, currency')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (org) {
        await supabase.from('cash_flows').insert({
          organization_id: org.id,
          amount: invoice.amount_paid / 100,
          flow_type: 'OUT',
          category: 'subscription',
          from_to: 'Stripe — BizPocket Plan',
          date: new Date(invoice.created * 1000).toISOString().slice(0, 10),
          notes: `Invoice ${invoice.number || invoice.id}`,
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getSubscriptionId(invoice)

      if (!subscriptionId) break

      // Mark org as past_due so UI can show warning
      await supabase
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId)

      console.error('[Stripe Webhook] Payment failed for invoice:', invoice.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
