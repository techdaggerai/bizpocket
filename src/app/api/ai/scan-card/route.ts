import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    let base64Data = image;
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        base64Data = match[2];
      }
    }

    if (base64Data.length > 14_000_000) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          {
            type: 'text',
            text: `Extract all information from this business card. Translate Japanese/Chinese/Korean fields to English.

Return ONLY valid JSON:
{
  "name": "original name as printed",
  "name_translated": "English translation/romanization",
  "company": "original company name",
  "company_translated": "English translation",
  "title": "original job title",
  "title_translated": "English translation",
  "phone": "phone number with country code",
  "email": "email address",
  "address": "original address",
  "address_translated": "English translation",
  "website": "URL",
  "line_id": "LINE ID if present",
  "detected_language": "language of the card (e.g. Japanese, Chinese, English)",
  "has_card": true
}

If no business card is detected, return {"has_card": false}.
If a field is not found, return empty string. Only extract what is visible — do not guess.
Return ONLY the JSON, no markdown or extra text.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[scan-card]', error);
    return NextResponse.json({ error: 'Card scan failed. Please try again.' }, { status: 500 });
  }
}
