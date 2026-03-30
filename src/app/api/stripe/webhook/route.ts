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

function planFromPriceId(priceId: string): 'pro' | 'business' {
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business'
  return 'pro'
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const supabase = getSupabase()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata.organization_id
      if (!orgId) break

      const priceId = subscription.items.data[0]?.price.id
      const plan = planFromPriceId(priceId)
      const isActive = ['active', 'trialing'].includes(subscription.status)

      await supabase
        .from('organizations')
        .update({
          plan: isActive ? plan : 'free',
          stripe_subscription_id: subscription.id,
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
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('id', orgId)

      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id

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
      console.error('[Stripe Webhook] Payment failed for invoice:', invoice.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
