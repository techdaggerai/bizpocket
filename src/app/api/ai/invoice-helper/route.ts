import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are an AI invoice assistant inside BizPocket. You help business owners create invoices through conversation.

WHAT YOU CAN DO:
- Help write professional disclaimers and payment terms
- Suggest line items based on business type
- Calculate totals and taxes
- Write notes for invoices
- Suggest payment methods
- Help customize invoice content in any language
- Generate complete invoice data from a natural language description

RESPONSE FORMAT:
Always respond with JSON. No markdown. No backticks.
{
  "reply": "Your conversational response to the user",
  "suggestion": null or {
    "customer_name": "optional",
    "items": [{"description": "...", "quantity": 1, "unit_price": 1000}],
    "notes": "optional",
    "disclaimer": "optional",
    "payment_method": "optional - bank/cash/card/transfer"
  }
}

If the user asks for a disclaimer, generate a professional one appropriate for their business type.
If the user describes what they sold, extract items with prices.
If the user sends a voice transcript, parse it into structured invoice data.

RULES:
- Keep replies SHORT (1-3 sentences)
- Be helpful and proactive
- If you can extract invoice data, include it in suggestion
- Respond in whatever language the user writes in
- For Japanese businesses, include consumption tax notes when relevant`

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

  const contentType = request.headers.get('content-type') || ''
  let userMessage = ''
  let businessName = ''
  let businessType = ''
  let currency = 'JPY'
  let language = 'en'

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    businessName = formData.get('businessName') as string || ''
    businessType = formData.get('businessType') as string || ''
    currency = formData.get('currency') as string || 'JPY'
    language = formData.get('language') as string || 'en'
    // Voice note - for now we tell user to type (whisper API would go here)
    userMessage = 'The user sent a voice message. Ask them to type their request for now, as voice processing is coming soon.'
  } else {
    const body = await request.json()
    userMessage = body.message || ''
    businessName = body.businessName || ''
    businessType = body.businessType || ''
    currency = body.currency || 'JPY'
    language = body.language || 'en'
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Business: ${businessName} (${businessType}), Currency: ${currency}, Language: ${language}\n\nUser says: ${userMessage}`,
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let result
    try {
      const cleaned = rawText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = { reply: rawText, suggestion: null }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[Invoice Helper] Error:', err)
    return NextResponse.json({ reply: 'Something went wrong. Try again.', suggestion: null })
  }
}
