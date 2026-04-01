import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { message: string; businessName: string; businessType: string; currency: string; language: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, businessName, businessType, currency } = body

  if (!message || typeof message !== 'string' || message.length > 1000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }

  const systemPrompt = `You parse natural language cash flow entries into structured data.

The user will describe a money in or money out transaction in any language. Parse it and return JSON only. No markdown. No backticks.

{
  "entry": {
    "flow_type": "IN" or "OUT",
    "amount": number (just the number, no currency symbol),
    "category": "one of: Sale, Purchase, Repair Cost, Parts, Rent, Fuel, Food, Salary, Utility, Shipping, Tax, Insurance, Marketing, Supplies, Delivery, Service Fee, Commission, Subscription, Equipment, Other",
    "from_to": "person or company name if mentioned, otherwise empty string",
    "description": "brief note about the transaction",
    "date": "YYYY-MM-DD format, today if not specified"
  }
}

RULES:
- "paid", "spent", "bought", "cost" = OUT
- "received", "got", "sold", "earned", "payment from" = IN
- Extract the amount (handle ¥, $, €, numbers with commas)
- Pick the most appropriate category
- Today's date: ${new Date().toISOString().slice(0, 10)}
- Business: ${businessName} (${businessType})
- Currency: ${currency}
- If you cannot parse, return {"error": "Could not understand. Try: Paid ¥5000 for flour"}`

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = rawText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    try {
      const result = JSON.parse(cleaned)
      return NextResponse.json(result)
    } catch {
      return NextResponse.json({ error: 'Could not parse response' })
    }
  } catch (err) {
    console.error('[CashFlow Quick] Error:', err)
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
  }
}
