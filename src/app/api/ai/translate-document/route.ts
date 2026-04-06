import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic',
  bn: 'Bengali', pt: 'Portuguese', tl: 'Filipino', vi: 'Vietnamese',
  tr: 'Turkish', zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ko: 'Korean', hi: 'Hindi', th: 'Thai', id: 'Indonesian',
}

const SYSTEM_PROMPT = `You are a document translator. Extract ALL text from this image. Return a JSON object with:
{
  "original_text": "string — all original text found in the document",
  "translated_text": "string — full translation of the document",
  "detected_language": "string — ISO code of the source language e.g. ja, zh, ko",
  "document_type": "Form | Letter | Receipt | Contract | Menu | Certificate | Invoice | Government | Other",
  "fields": [
    { "label": "string — field name/label", "original": "string — original text", "translated": "string — translated text" }
  ]
}

Rules:
- If the document is a form, identify EACH field separately in the fields array
- If it's a letter/receipt/menu, put the full text in original_text/translated_text and use fewer fields
- Always detect the source language accurately
- Translate to the user's requested language
- For forms: labels should be descriptive (e.g. "Name", "Date of Birth", "Address")
- Respond with JSON ONLY. No markdown. No backticks. No preamble.`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { imageBase64: string; mediaType: string; targetLanguage?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { imageBase64, mediaType, targetLanguage } = body
  if (!imageBase64) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  }

  const lang = targetLanguage || 'en'
  const langName = LANGUAGE_NAMES[lang] || 'English'

  try {
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Translate this document to ${langName}. Extract all text and fields. Respond with JSON only.`,
            },
          ],
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let result
    try {
      const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = {
        original_text: rawText,
        translated_text: rawText,
        detected_language: 'unknown',
        document_type: 'Other',
        fields: [],
      }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[translate-document]', err?.message || err)
    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 }
    )
  }
}
