import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkUsageLimit, incrementUsage } from '@/lib/usage';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Brazilian Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Simplified Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ko: 'Korean', hi: 'Hindi', th: 'Thai', id: 'Indonesian',
};

// Default ElevenLabs voice IDs per language
const VOICE_IDS: Record<string, string> = {
  ja: 'AZnzlk1XvdvUeBnXmlld',
  en: 'EXAVITQu4vr4xnSDxMaL',
  zh: 'AZnzlk1XvdvUeBnXmlld',
  ko: 'AZnzlk1XvdvUeBnXmlld',
  es: 'EXAVITQu4vr4xnSDxMaL',
  pt: 'EXAVITQu4vr4xnSDxMaL',
  fr: 'EXAVITQu4vr4xnSDxMaL',
  ar: 'AZnzlk1XvdvUeBnXmlld',
  ur: 'AZnzlk1XvdvUeBnXmlld',
  vi: 'AZnzlk1XvdvUeBnXmlld',
  tr: 'EXAVITQu4vr4xnSDxMaL',
  hi: 'AZnzlk1XvdvUeBnXmlld',
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

    const { text, fromLang, toLang } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const fromName = LANG_NAMES[fromLang] || fromLang || 'English';
    const toName = LANG_NAMES[toLang] || toLang || 'Japanese';

    // Step 1: Translate with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a spoken language translator. Translate naturally from ${fromName} to ${toName}. Keep the tone conversational and natural — this will be spoken aloud. Output ONLY the translation, nothing else.`,
      messages: [{ role: 'user', content: text.trim() }],
    });

    const translatedText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : text;

    // Step 2: Generate TTS with ElevenLabs (hardcoded voice IDs only)
    let audioBase64 = '';
    if (process.env.ELEVENLABS_API_KEY) {
      const voiceId = VOICE_IDS[toLang] || VOICE_IDS.en || 'EXAVITQu4vr4xnSDxMaL';
      try {
        const audioRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: translatedText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (audioRes.ok) {
          const buf = await audioRes.arrayBuffer();
          audioBase64 = Buffer.from(buf).toString('base64');
        }
      } catch (err) {
        console.error('[voice-live-translate] TTS error:', err);
      }
    }

    if (profile) incrementUsage(supabase, profile.organization_id, 'voice_translate');

    return NextResponse.json({
      originalText: text.trim(),
      translatedText,
      audioBase64,
      fromLang,
      toLang,
    });
  } catch (error) {
    console.error('[voice-live-translate]', error);
    return NextResponse.json({ error: 'Voice translation failed' }, { status: 500 });
  }
}
