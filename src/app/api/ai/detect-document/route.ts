import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic',
  bn: 'Bengali', pt: 'Portuguese', tl: 'Filipino', vi: 'Vietnamese',
  tr: 'Turkish', zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 200 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { imageBase64: string; mediaType: string; language: string; organizationId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { imageBase64, mediaType, language, organizationId } = body;
  if (!imageBase64 || !organizationId) {
    return NextResponse.json({ error: 'Missing image or organizationId' }, { status: 400 });
  }

  const targetLang = LANG_NAMES[language] || 'English';

  const systemPrompt = `You are BizPocket AI Document Detector. You analyze photos of documents and provide structured information.

You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.

Response schema:
{
  "document_type": "string — document type in ${targetLang}",
  "document_type_local": "string — document type in its original language",
  "confidence": "high | medium | low",
  "original_language": "string — detected language of the document",
  "key_info": {
    "amounts": ["string array — all monetary amounts found, with currency symbols"],
    "dates": ["string array — all dates found, in YYYY-MM-DD format when possible"],
    "parties": ["string array — names of people/companies mentioned"],
    "reference_numbers": ["string array — any reference/invoice/tax numbers"]
  },
  "translation": "string — full translation of the key content into ${targetLang}",
  "explanation": "string — plain-language explanation of what this document means and why it matters, in ${targetLang}",
  "suggested_action": "string — what the user should do about this document, in ${targetLang}",
  "urgency": "high | medium | low",
  "category": "tax | financial | legal | government | medical | shipping | invoice | receipt | contract | other"
}`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    const resolvedType = validTypes.includes(mediaType as typeof validTypes[number])
      ? (mediaType as typeof validTypes[number])
      : 'image/jpeg';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: resolvedType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this document. Translate and explain in ${targetLang}. Respond with JSON only.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 200 });
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error('[BizPocket AI] Document detection failed:', err);
    return NextResponse.json({ error: 'AI detection failed' }, { status: 200 });
  }
}
