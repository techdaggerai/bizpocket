import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', tl: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Persian', hi: 'Hindi', ko: 'Korean', th: 'Thai',
  id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
};

export async function POST(req: NextRequest) {
  try {
    // ─── Auth ───
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, senderName, userLanguage, recipientLanguage, isPro } = await req.json();

    if (!message || !userLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const userLangName = LANGUAGE_NAMES[userLanguage] || userLanguage;
    const recipientLangName = LANGUAGE_NAMES[recipientLanguage] || recipientLanguage;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Pro: generate in recipient's language; Free: generate in user's language only
    const targetLang = isPro && recipientLanguage && recipientLanguage !== userLanguage
      ? recipientLangName
      : userLangName;

    const system = `You are a smart reply assistant for a multilingual chat app called Evrywher.
Generate exactly 3 short, natural reply suggestions in ${targetLang}.
Rules:
- Each reply must be under 8 words
- Replies should be contextually appropriate to the received message
- Use casual, natural conversational language
- Vary the tone: one agreeable, one declining/alternative, one question or follow-up
- Return ONLY a JSON array of 3 strings, nothing else
- Example format: ["Sure, sounds good!", "Sorry, can't make it", "What time were you thinking?"]`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 150,
      system,
      messages: [{
        role: 'user',
        content: `${senderName ? `${senderName} says: ` : ''}${message}`,
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

    // Parse JSON array
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3).map(String);
      }
    } catch {
      // Fallback: extract quoted strings
      const matches = raw.match(/"([^"]+)"/g);
      if (matches) suggestions = matches.slice(0, 3).map(s => s.replace(/"/g, ''));
    }

    return NextResponse.json({ suggestions, language: targetLang });
  } catch (error) {
    console.error('[smart-replies]', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
