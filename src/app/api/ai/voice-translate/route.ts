import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Farsi', hi: 'Hindi', ko: 'Korean',
  th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
  ru: 'Russian', de: 'German', it: 'Italian', ms: 'Malay',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, fromLang = 'en', toLang = 'ja' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (fromLang === toLang) {
      return NextResponse.json({ translated_text: text });
    }

    const fromName = LANG_NAMES[fromLang] || fromLang;
    const toName = LANG_NAMES[toLang] || toLang;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Translate the following from ${fromName} to ${toName}. If translating to Japanese, use natural conversational Japanese. Return ONLY the translation, nothing else.`,
      messages: [{ role: 'user', content: text.trim() }],
    });

    const translated_text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : text;

    return NextResponse.json({ translated_text });
  } catch (error) {
    console.error('[voice-translate]', error);
    return NextResponse.json({ error: 'Voice translation failed' }, { status: 500 });
  }
}
