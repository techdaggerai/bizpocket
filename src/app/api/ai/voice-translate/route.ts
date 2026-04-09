import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkUsageLimit, incrementUsage } from '@/lib/usage';

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
    // ─── Auth ───
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ─── Rate limit ───
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user.id).single();
    if (profile) {
      const { data: org } = await supabase.from('organizations').select('plan').eq('id', profile.organization_id).single();
      const usage = await checkUsageLimit(supabase, profile.organization_id, 'voice_translate', org?.plan || 'free');
      if (!usage.allowed) {
        return NextResponse.json({ error: 'limit_reached', message: `Free plan limit: ${usage.limit} voice translations/day.`, used: usage.used, limit: usage.limit }, { status: 429 });
      }
    }

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

    if (profile) incrementUsage(supabase, profile.organization_id, 'voice_translate');
    return NextResponse.json({ translated_text });
  } catch (error) {
    console.error('[voice-translate]', error);
    return NextResponse.json({ error: 'Voice translation failed' }, { status: 500 });
  }
}
