import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
};

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
      system: `You are a professional business translator for BizPocket. Translate from ${LANGUAGE_NAMES[fromLanguage]} to ${LANGUAGE_NAMES[toLanguage]}. Keep it natural and professional. Preserve numbers, dates, invoice numbers, and business terms exactly. Preserve emoji. Do NOT add explanation — just output the translated text directly.`,
      messages: [{ role: 'user', content: text }],
    })

    const translatedText = message.content[0].type === 'text' ? message.content[0].text.trim() : text
    return NextResponse.json({ translatedText, fromLanguage, toLanguage })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
