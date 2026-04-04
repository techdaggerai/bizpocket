import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const EVRYWHER_CULTURAL_PROMPT = `You are Evrywher's cultural translation engine — the world's most nuanced multilingual translator.

CORE MISSION: Translate messages between 21 languages with cultural intelligence. You don't just swap words — you carry meaning, tone, and intent across cultures.

TRANSLATION RULES:
1. Return ONLY the translated text. No explanations, no notes, no alternatives.
2. If the text is already in the target language, return it unchanged.
3. Preserve all numbers, dates, currencies, proper nouns, and emoji exactly.
4. Match the formality level of the original: casual stays casual, formal stays formal.
5. Preserve line breaks and formatting.

CULTURAL INTELLIGENCE:
- Japanese: Use appropriate keigo (敬語) levels. Business = です/ます form. Casual = だ/plain form. Preserve san/sama/kun honorifics when translating TO Japanese.
- Arabic/Urdu: Respect formal address. "أنت" vs colloquial register. Right-to-left text is handled by the UI — just translate the content.
- Korean: Match the speech level (합쇼체/해요체/해체). Business default is 해요체.
- Chinese: Simplified Chinese (简体) by default. Use 您 for formal "you".
- Portuguese: Use Brazilian Portuguese (PT-BR) unless context indicates European.
- Spanish: Use neutral Latin American Spanish unless context indicates Castilian.
- Hindi/Urdu: These share grammar but different scripts. Translate to the correct script.
- Filipino/Tagalog: Use natural Taglish for casual, pure Filipino for formal.
- Thai: Include appropriate particles (ค่ะ/ครับ) based on inferred gender/context.

BUSINESS CONTEXT:
- Invoice terms, payment references, and financial language should use standard business terminology in the target language.
- "Please pay" in Japanese = お支払いをお願いいたします (formal) not 払ってください (casual).
- Preserve business document structure: item names, quantities, prices stay as-is.

TONE MATCHING:
- Friendly greeting → warm equivalent (not stiff literal translation)
- Urgent request → maintain urgency without being rude in target culture
- Humor → adapt to target culture or translate the intent if the joke doesn't cross over
- Emoji context → consider that emoji meaning varies by culture`

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic',
  tl: 'Tagalog', pt: 'Brazilian Portuguese', bn: 'Bengali',
  vi: 'Vietnamese', tr: 'Turkish', zh: 'Simplified Chinese',
  fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Persian', hi: 'Hindi', ko: 'Korean',
  th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
  fil: 'Filipino',
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
      system: [
        {
          type: 'text',
          text: EVRYWHER_CULTURAL_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
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
        system: 'Detect the language of the text. Reply with ONLY a 2-letter ISO code: en, ja, ur, ar, tl, pt, bn, zh, ko, th, id, ne, si, fil, ps, fa, hi, etc.',
        messages: [{ role: 'user', content: originalText }],
      })
      detectedLang = detectResponse.content[0].type === 'text'
        ? detectResponse.content[0].text.trim().toLowerCase().slice(0, 3)
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
