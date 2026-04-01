import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are BizPocket Invoice AI — a smart assistant that helps business owners create invoices faster.

When the user describes items, services, or products, extract structured invoice data.

ALWAYS respond with valid JSON in this exact format:
{
  "items": [{ "description": "string", "quantity": number, "unit_price": number }],
  "notes": "string or null",
  "disclaimer": "string or null",
  "payment_method": "bank_transfer" | "cash" | "credit_card" | null,
  "customer_name": "string or null",
  "message": "A short, friendly confirmation of what you understood"
}

Rules:
- Extract item descriptions, quantities, and unit prices from natural language
- If the user mentions a customer, include customer_name
- If payment method is mentioned, include it
- If a disclaimer or policy is mentioned, include it
- The "message" field should be a brief, helpful response
- Currency context: the user's org currency will be provided
- Be smart about interpreting prices (e.g., "7200 dollars" → unit_price: 7200)
- Default quantity to 1 if not specified
- Never make up prices — if unclear, set unit_price to 0 and mention it in message`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 200 })
  }

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
  const { message, organizationId, currency } = body

  if (!message || !organizationId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Currency: ${currency || 'JPY'}\n\nUser request: ${message}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json({ suggestion: parsed })
    }

    return NextResponse.json({ suggestion: { message: text, items: [] } })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
