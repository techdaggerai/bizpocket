import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Image too large' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          {
            type: 'text',
            text: `This is a business card (名刺 meishi), likely Japanese. Extract ALL information visible on the card.

Return ONLY valid JSON in this format:
{
  "name_japanese": "Japanese name if visible",
  "name_romaji": "Romanized name",
  "company_japanese": "Company name in Japanese",
  "company_english": "Company name in English",
  "title_japanese": "Job title in Japanese",
  "title_english": "Job title in English",
  "email": "email@example.com",
  "phone": "+81-...",
  "mobile": "+81-...",
  "fax": "",
  "address_japanese": "Full address in Japanese",
  "address_english": "Full address in English",
  "website": "https://...",
  "department": "Department name",
  "language": "ja",
  "has_card": true
}

If no business card is detected, return {"has_card": false}.
Use empty strings for fields not found on the card. Do not guess — only extract what is visible.
Return ONLY the JSON, no markdown or extra text.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try { result = JSON.parse(clean); } catch { return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 }); }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[scan-business-card]', error);
    return NextResponse.json({ error: 'Scan failed. Please try again.' }, { status: 500 });
  }
}
