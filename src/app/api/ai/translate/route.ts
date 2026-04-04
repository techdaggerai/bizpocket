import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Persian', hi: 'Hindi', ko: 'Korean',
  th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
    )

    const { text, fromLanguage, toLanguage, publicToken } = await req.json()

    // Auth: either authenticated user OR valid public invoice token
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (!publicToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      // Verify public token belongs to a real invoice
      const { data: inv } = await supabase.from('invoices').select('id').eq('public_token', publicToken).single()
      if (!inv) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!text || !fromLanguage || !toLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!LANGUAGE_NAMES[fromLanguage] || !LANGUAGE_NAMES[toLanguage]) {
      return NextResponse.json({ error: 'Unsupported language code' }, { status: 400 })
    }
    if (fromLanguage === toLanguage) {
      return NextResponse.json({ translatedText: text, fromLanguage, toLanguage })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: EVRYWHER_CULTURAL_PROMPT + `\n\nTranslate from ${LANGUAGE_NAMES[fromLanguage]} to ${LANGUAGE_NAMES[toLanguage]}.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    })

    const translatedText = message.content[0].type === 'text' ? message.content[0].text.trim() : text
    return NextResponse.json({ translatedText, fromLanguage, toLanguage })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
