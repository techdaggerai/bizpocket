import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu',
  ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { image, language, previousSteps, deviceType, isDocument } = await req.json()

    if (!image) {
      return NextResponse.json({ error: 'No image' }, { status: 400 })
    }

    const targetLang = LANG_NAMES[language] || 'English'
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const systemPrompt = isDocument
      ? `You are a document reader helping a foreigner in Japan.
         Read ALL text in this document/form. Extract key information like:
         bank details, account numbers, names, addresses, amounts, dates.
         Organize the information clearly.
         Respond ENTIRELY in ${targetLang}.
         Format: first list what you found, then explain what each field means.`
      : `You are a real-time visual guide helping a foreigner in Japan navigate
         a Japanese machine, screen, or interface. The user is pointing their phone
         camera at something they cannot read.

         RULES:
         - Identify what device/screen/machine this is (ATM, ticket machine, kiosk, etc.)
         - Read ALL Japanese text on the screen
         - Determine what step the user is at in the process
         - Give ONE clear, specific instruction for what to do NEXT
         - Respond ENTIRELY in ${targetLang}
         - Be specific: "Press the blue button that says お振込み (transfer)" not just "press a button"
         - If you see input fields, tell them exactly what to type
         - If you see amounts, translate them
         - Keep instructions short — 1 to 2 sentences max
         - If this is a continuation, build on previous steps

         ${deviceType ? `Device identified as: ${deviceType}` : ''}
         ${previousSteps ? `Previous steps completed:\n${previousSteps}` : 'This is the first step.'}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: isDocument
                ? 'Read this document and extract all important information. What does it say?'
                : 'What am I looking at? What should I do next?',
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Could not read the screen. Try moving closer.'

    let detectedDevice = deviceType || ''
    const deviceKeywords = [
      'ATM', 'ticket machine', 'kiosk', 'vending',
      'self-checkout', 'copy machine', 'parking',
      'restaurant', 'hospital', 'post office',
    ]
    for (const kw of deviceKeywords) {
      if (text.toLowerCase().includes(kw.toLowerCase())) {
        detectedDevice = kw
        break
      }
    }

    return NextResponse.json({
      analysis: text,
      instruction: text,
      deviceType: detectedDevice,
    })
  } catch (error) {
    console.error('Live guide error:', error)
    return NextResponse.json({ error: 'Guide failed' }, { status: 500 })
  }
}
