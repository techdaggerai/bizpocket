import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const ALLOWED_CONTEXTS = ['boss', 'colleague', 'client', 'landlord', 'doctor', 'shop', 'friend', 'stranger'] as const

// In-memory rate limiter: 20 requests per minute per user
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 20
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

    const { message, context, targetLang } = await req.json()

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    if (!context || !ALLOWED_CONTEXTS.includes(context)) {
      return NextResponse.json({ error: 'Invalid context' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are a Japanese cultural communication expert. The user wants to communicate something in a Japanese context. Analyze their message for cultural appropriateness and provide:
1) A directness rating (1-5, where 1 is very indirect/polite and 5 is too direct).
2) Any cultural issues with the message.
3) A polite Japanese version (using appropriate keigo if needed).
4) The romanization.
5) A brief explanation of why the polite version works better.

Format as JSON only, no markdown:
{"rating":number,"issues":["string"],"politeVersion":"string","romanization":"string","explanation":"string"}`,
      messages: [{
        role: 'user',
        content: `Context: Speaking to my ${context}. I want to say: "${message}"${targetLang ? ` (target language: ${targetLang})` : ''}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let result
    try {
      result = JSON.parse(clean)
    } catch {
      return NextResponse.json({
        error: 'Could not analyze. Your message may be fine — when in doubt, add すみません at the start.',
      }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[cultural-coach]', error)
    return NextResponse.json({
      error: 'Could not analyze. Your message may be fine — when in doubt, add すみません at the start.',
    }, { status: 500 })
  }
}
