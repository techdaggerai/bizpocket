import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// In-memory rate limiter: 10 requests per minute per user
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) || []
  const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { image, formType } = await req.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }

    // Whitelist formType — only pass known values to prompt
    const ALLOWED_FORM_TYPES = ['juminhyo', 'tennin', 'bank', 'phone', 'apartment', 'hospital', 'school', 'custom', 'bank-transfer', 'address-change', 'residence-card', 'city-hall', 'insurance-claim', 'apartment-contract']
    const safeFormType = ALLOWED_FORM_TYPES.includes(formType) ? formType : 'unknown'

    // Strip data URL prefix if present
    const base64 = image.replace(/^data:image\/\w+;base64,/, '')

    // base64 is ~4/3 of original size, so 5MB file ≈ 6.67M base64 chars
    if (base64.length > 7_000_000) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          {
            type: 'text',
            text: `You are a Japanese form expert helping foreigners fill out Japanese forms.
${safeFormType !== 'unknown' ? `Form type hint: ${safeFormType}` : ''}

This is a Japanese form. For EACH field/box visible in the form:
1) Identify the field label (Japanese + English translation)
2) Explain what information goes in this field
3) Provide an example of what to write
4) Note any special format required (e.g. YYYY/MM/DD for dates, katakana for foreign names)
5) Flag any culturally important fields (like hanko/seal boxes)

Return ONLY valid JSON — no markdown, no backticks:
{
  "formTitle": "Japanese title",
  "formTitleTranslated": "English title",
  "fields": [
    {
      "number": 1,
      "label_jp": "Japanese label",
      "label_en": "English label",
      "explanation": "What to write here",
      "example": "Example value",
      "format": "Special format note or null",
      "cultural_note": "Cultural note or null"
    }
  ]
}

Order fields top-to-bottom, left-to-right as they appear on the form.`,
          },
        ],
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let result
    try {
      result = JSON.parse(clean)
    } catch {
      console.error('[form-fill] Failed to parse Claude response:', clean.slice(0, 200))
      return NextResponse.json({ formTitle: '', formTitleTranslated: 'Form', fields: [] })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[form-fill]', error)
    return NextResponse.json({ error: 'Analysis failed. Please try again with a clearer photo.' }, { status: 500 })
  }
}
