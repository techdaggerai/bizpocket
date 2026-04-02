import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const transcription = formData.get('transcription') as string;
    const fromLanguage = (formData.get('fromLanguage') as string) || 'en';
    const toLanguage = (formData.get('toLanguage') as string) || 'ja';

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    if (fromLanguage === toLanguage) {
      return NextResponse.json({ originalText: transcription, translatedText: transcription, fromLanguage, toLanguage });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Translate this spoken message from ${LANGUAGE_NAMES[fromLanguage] || fromLanguage} to ${LANGUAGE_NAMES[toLanguage] || toLanguage}. Keep the natural spoken tone. Output ONLY the translation, nothing else.`,
      messages: [{ role: 'user', content: transcription }],
    });

    const translatedText = response.content[0].type === 'text' ? response.content[0].text.trim() : transcription;
    return NextResponse.json({ originalText: transcription, translatedText, fromLanguage, toLanguage });
  } catch (error) {
    console.error('Voice translate error:', error);
    return NextResponse.json({ error: 'Voice translation failed' }, { status: 500 });
  }
}
