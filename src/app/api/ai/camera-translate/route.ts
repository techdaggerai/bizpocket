import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
  pt: 'Portuguese', fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Farsi', hi: 'Hindi', ko: 'Korean',
  th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, userLanguage, userName, targetLanguage, sourceLang } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Extract base64 data — handle both raw base64 and data URL
    let base64Data = image;
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        base64Data = match[2];
      }
    }

    // Size check (~10MB base64)
    if (base64Data.length > 14_000_000) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    // Determine mode: new Camera Translate page vs legacy CameraTranslate component
    const isNewMode = !!targetLanguage;
    const targetLang = targetLanguage || LANG_NAMES[userLanguage] || 'English';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (isNewMode) {
      // ─── New Camera Translate mode ───
      const sourceHint = sourceLang && LANG_NAMES[sourceLang]
        ? `The source language is likely ${LANG_NAMES[sourceLang]}, but verify by analyzing the text.`
        : 'Auto-detect the source language.';

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `Extract ALL visible text from this image. ${sourceHint} Translate to ${targetLang}.

Return ONLY this JSON:
{
  "detected_language": "language name (e.g. Japanese, Arabic, French)",
  "original_text": "all original text exactly as it appears",
  "translated_text": "full translation to ${targetLang}",
  "confidence": "high or medium or low"
}

If the image contains no readable text, return:
{
  "detected_language": "Unknown",
  "original_text": "",
  "translated_text": "",
  "confidence": "low"
}

Return ONLY valid JSON. No markdown, no explanation.`,
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
    }

    // ─── Legacy mode (CameraTranslate component from chat) ───
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          },
          {
            type: 'text',
            text: `You are Evrywher's AI translator. The user is a foreigner in Japan who has photographed a document, sign, form, or menu in Japanese (or another language).

Please analyze this image and provide:
1. EXTRACTED TEXT: All text you can read in the image
2. TRANSLATION: Full translation to ${targetLang}
3. DOCUMENT TYPE: What type of document/sign this is
4. CONTEXT: Cultural context and any important notes
5. FIELD GUIDE: If it's a form, explain each field and what to write.
   For each field, provide a SPECIFIC suggested value the user can copy and paste.
   ${userName ? `The user's name is "${userName}" — convert to katakana if a name field requires it.` : ''}
   For dates, use today's date in Japanese format (令和 era).
   For addresses, explain the Japanese format (〒postal code, prefecture, city).

Common Japanese forms to recognize:
- 振込用紙 (Bank transfer slip)
- 転入届 (Moving-in notification)
- 在留カード変更届 (Residence card change)
- 国民健康保険 (National health insurance)
- 住民票 (Resident registration)
- 確定申告 (Tax return)

Respond in this EXACT JSON format only:
{
  "extracted_text": "all original text found in the image",
  "translation": "full ${targetLang} translation of all text",
  "document_type": "e.g., Bank Transfer Form, Restaurant Menu, Train Schedule",
  "context": "cultural explanation and helpful notes",
  "fields": [
    {
      "japanese": "field label in original language",
      "english": "what it means in ${targetLang}",
      "instruction": "what the user should write/enter here"
    }
  ],
  "has_text": true
}

If no text is detected in the image, return:
{
  "has_text": false,
  "extracted_text": "",
  "translation": "",
  "document_type": "Unknown",
  "context": "No text was detected in this image. Please try pointing the camera directly at the text and ensure good lighting.",
  "fields": []
}

Return ONLY valid JSON. No markdown, no extra text.`,
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
    console.error('[camera-translate]', error);
    return NextResponse.json({ error: 'Camera translation failed. Please try again.' }, { status: 500 });
  }
}
