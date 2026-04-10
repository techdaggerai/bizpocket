import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// In-memory rate limiter: 15 requests per minute per user
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 15
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

    const { image } = await req.json()
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Parse data URL or raw base64 — whitelist MIME types
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
    type AllowedType = typeof ALLOWED_TYPES[number]
    let base64Data = image
    let mediaType: AllowedType = 'image/jpeg'
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        if (!ALLOWED_TYPES.includes(match[1] as AllowedType)) {
          return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
        }
        mediaType = match[1] as AllowedType
        base64Data = match[2]
      }
    }

    // 5MB limit (base64 is ~4/3 of original)
    if (base64Data.length > 7_000_000) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          {
            type: 'text',
            text: `This is a Japanese business card (meishi). Extract ALL information:
1) Name in Japanese (kanji)
2) Name in English/romaji if present
3) Company name (Japanese + English)
4) Job title (Japanese + English)
5) Phone number(s)
6) Email address(es)
7) Website
8) Address (Japanese + English)
9) Fax number if present
10) Department if present

Return ONLY valid JSON — no markdown, no backticks:
{
  "name": "original name as printed",
  "name_translated": "English translation/romanization",
  "company": "original company name",
  "company_translated": "English translation",
  "title": "original job title",
  "title_translated": "English translation",
  "phone": "phone number with country code",
  "email": "email address",
  "address": "original address",
  "address_translated": "English translation",
  "website": "URL",
  "line_id": "LINE ID if present",
  "detected_language": "language of the card",
  "has_card": true
}

If no business card is detected, return {"has_card": false}.
If a field is not found, return empty string. Only extract what is visible — do not guess.`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let result
    try {
      result = JSON.parse(clean)
    } catch {
      console.error('[scan-card] Failed to parse Claude response:', clean.slice(0, 200))
      return NextResponse.json({ has_card: false, error: 'Could not read the card. Please try a clearer photo.' })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[scan-card]', error)
    return NextResponse.json({ error: 'Card scan failed. Please try again.' }, { status: 500 })
  }
}
