import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const targetLanguage = (formData.get('targetLanguage') as string) || 'en';

    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });
    if (image.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `Read ALL text in this image. Then translate everything to ${LANG_NAMES[targetLanguage] || 'English'}.\n\nReturn in this EXACT JSON format only:\n{"originalText":"all text found","originalLanguage":"detected lang code","translatedText":"full translation","items":[{"original":"line","translated":"translated line"}]}\n\nReturn ONLY the JSON. No other text.` },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try { result = JSON.parse(clean); } catch { return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 }); }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image translate error:', error);
    return NextResponse.json({ error: 'Image translation failed' }, { status: 500 });
  }
}
