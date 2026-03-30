import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic',
  bn: 'Bengali', pt: 'Portuguese', tl: 'Filipino', vi: 'Vietnamese',
  tr: 'Turkish', zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
}

const SYSTEM_PROMPT = `You are BizPocket AI — a document detection assistant for foreign entrepreneurs running businesses in Japan.

When given an image of a document, you must:
1. DETECT what type of document it is (tax notice, invoice, contract, receipt, government form, letter, certificate, etc.)
2. EXTRACT the key information (amounts, dates, names, reference numbers)
3. TRANSLATE the full content to the user's language
4. EXPLAIN what this document means in simple terms
5. SUGGEST a specific action the user should take

You MUST respond in valid JSON only. No markdown. No backticks. No preamble.

Response format:
{
  "document_type": "string — e.g. Vehicle Tax Notice, Business Registration Certificate, Invoice",
  "document_type_local": "string — the document type in the original language e.g. 自動車税納税通知書",
  "confidence": "high | medium | low",
  "original_language": "string — detected language of the document",
  "key_info": {
    "amounts": ["string array of any monetary amounts found"],
    "dates": ["string array of any dates found"],
    "parties": ["string array of any names/companies mentioned"],
    "reference_numbers": ["string array of any reference/ID numbers"]
  },
  "translation": "string — full translation of the document content",
  "explanation": "string — plain language explanation of what this document is and what it means for the business owner",
  "suggested_action": "string — specific actionable recommendation",
  "urgency": "high | medium | low",
  "category": "tax | legal | financial | government | business | personal | other"
}`

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

  let body: { imageBase64: string; mediaType: string; language?: string; organizationId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { imageBase64, mediaType, language, organizationId } = body
  if (!imageBase64 || !organizationId) {
    return NextResponse.json({ error: 'Missing image or organizationId' }, { status: 400 })
  }

  const userLang = language || 'en'
  const langName = LANGUAGE_NAMES[userLang] || 'English'

  try {
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
              text: `Analyze this document. The user's language is ${langName}. Translate and explain everything in ${langName}. Respond with JSON only.`,
            },
          ],
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON response
    let result
    try {
      const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      // If JSON parsing fails, return raw text as explanation
      result = {
        document_type: 'Document',
        document_type_local: '',
        confidence: 'medium',
        original_language: 'Unknown',
        key_info: { amounts: [], dates: [], parties: [], reference_numbers: [] },
        translation: rawText,
        explanation: rawText,
        suggested_action: 'Review this document carefully.',
        urgency: 'medium',
        category: 'other',
      }
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[BizPocket AI] Document detection failed:', err)
    return NextResponse.json({ error: 'AI detection failed' }, { status: 500 })
  }
}
