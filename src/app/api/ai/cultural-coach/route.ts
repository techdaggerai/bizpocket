import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish', ko: 'Korean',
  hi: 'Hindi', th: 'Thai', id: 'Indonesian', fa: 'Farsi', ps: 'Pashto',
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

    const { message, senderLanguage, contactLanguage, context } = await req.json();

    if (!message || !contactLanguage) {
      return NextResponse.json({ ok: true, severity: 'none' });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const senderLang = LANG_NAMES[senderLanguage] || senderLanguage || 'English';
    const contactLang = LANG_NAMES[contactLanguage] || contactLanguage || 'Japanese';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are Evrywher's Cultural Coach. The user is sending a message to someone who speaks ${contactLang}.

Analyze the message for cultural appropriateness. Consider:
- Directness level (too blunt for Japanese? too indirect for Germans?)
- Formality level (should they use formal speech?)
- Cultural taboos or sensitive topics
- Missing politeness markers

Respond in JSON only:
{
  "ok": true/false,
  "severity": "none" | "suggestion" | "warning",
  "tip": "brief cultural tip if needed",
  "suggested_revision": "improved version of the message in ${senderLang} if needed, or empty string",
  "cultural_note": "1-sentence explanation of why"
}

If the message is fine culturally, return {"ok": true, "severity": "none", "tip": "", "suggested_revision": "", "cultural_note": ""}.
Be helpful, not annoying — only flag genuinely important cultural gaps. Most casual messages are fine.`,
      messages: [{
        role: 'user',
        content: `Message being sent: "${message}"
Sender speaks: ${senderLang}
Recipient speaks: ${contactLang}
${context ? `Recent conversation context: ${context}` : ''}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return NextResponse.json({ ok: true, severity: 'none' });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[cultural-coach]', error);
    // On error, don't block sending
    return NextResponse.json({ ok: true, severity: 'none' });
  }
}
