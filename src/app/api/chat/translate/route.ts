import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic',
  tl: 'Tagalog', pt: 'Portuguese', bn: 'Bengali',
  vi: 'Vietnamese', tr: 'Turkish', zh: 'Simplified Chinese',
  fr: 'French', nl: 'Dutch', es: 'Spanish',
}

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

  let body: { messageId: string; targetLanguage: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { messageId, targetLanguage } = body
  if (!messageId || !targetLanguage) {
    return NextResponse.json({ error: 'Missing messageId or targetLanguage' }, { status: 400 })
  }

  // Fetch the message
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('message, original_text, original_language, translations')
    .eq('id', messageId)
    .single()

  if (msgError || !msg) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Check if translation already exists
  const existing = msg.translations as Record<string, string> | null
  if (existing && existing[targetLanguage]) {
    return NextResponse.json({
      translation: existing[targetLanguage],
      originalLanguage: msg.original_language,
      cached: true,
    })
  }

  const originalText = msg.original_text || msg.message
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'You are a professional business translator. Translate the message naturally and professionally. Return ONLY the translation, nothing else. If the text is already in the target language, return it unchanged.',
      messages: [{
        role: 'user',
        content: `Translate to ${targetName}:\n\n${originalText}`,
      }],
    })

    const translation = response.content[0].type === 'text' ? response.content[0].text.trim() : originalText

    // Detect original language if not set
    let detectedLang = msg.original_language
    if (!detectedLang) {
      const detectResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        system: 'Detect the language of the text. Reply with ONLY a 2-letter ISO code: en, ja, ur, ar, tl, pt, bn, zh, ko, etc.',
        messages: [{ role: 'user', content: originalText }],
      })
      detectedLang = detectResponse.content[0].type === 'text'
        ? detectResponse.content[0].text.trim().toLowerCase().slice(0, 2)
        : 'en'
    }

    // Save translation + original language to DB
    const updatedTranslations = { ...(existing || {}), [targetLanguage]: translation }
    await supabase
      .from('messages')
      .update({
        original_text: originalText,
        original_language: detectedLang,
        translations: updatedTranslations,
      })
      .eq('id', messageId)

    return NextResponse.json({
      translation,
      originalLanguage: detectedLang,
      cached: false,
    })
  } catch (err) {
    console.error('[Evrywher] Translation failed:', err)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
