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

// Hardcoded ElevenLabs voice IDs — never accept from client
const VOICE_MAP: Record<string, string> = {
  ja: 'Xb7hH8MSUJpSbSDYk0k2',
  en: 'JBFqnCBsd6RMkjVDRZzb',
  ur: 'JBFqnCBsd6RMkjVDRZzb',
  ar: 'JBFqnCBsd6RMkjVDRZzb',
  ko: 'Xb7hH8MSUJpSbSDYk0k2',
  zh: 'Xb7hH8MSUJpSbSDYk0k2',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish', ko: 'Korean',
  hi: 'Hindi', th: 'Thai', id: 'Indonesian',
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

    const { originalText, fromLang, toLang } = await req.json()

    if (!originalText || typeof originalText !== 'string' || originalText.length > 5000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 })
    }

    if (!fromLang || !toLang) {
      return NextResponse.json({ error: 'Missing language codes' }, { status: 400 })
    }

    const fromName = LANGUAGE_NAMES[fromLang] || fromLang
    const toName = LANGUAGE_NAMES[toLang] || toLang

    // Step 1: Translate text via Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const translateRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Translate the following text from ${fromName} to ${toName}. Return ONLY the translated text, nothing else.`,
      messages: [{ role: 'user', content: originalText }],
    })

    const translatedText = translateRes.content[0].type === 'text'
      ? translateRes.content[0].text.trim()
      : originalText

    // Step 2: Generate TTS via ElevenLabs
    let translatedAudioBase64: string | null = null
    const voiceId = VOICE_MAP[toLang] || VOICE_MAP.en
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY

    if (elevenLabsKey) {
      try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: translatedText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        })

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer()
          translatedAudioBase64 = Buffer.from(audioBuffer).toString('base64')
        }
      } catch (err) {
        console.error('[voice-message-translate] TTS failed:', err)
      }
    }

    return NextResponse.json({
      originalText,
      translatedText,
      translatedAudioBase64,
      fromLang,
      toLang,
    })
  } catch (error) {
    console.error('[voice-message-translate]', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
