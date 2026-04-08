import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu',
  ar: 'Arabic', bn: 'Bengali', pt: 'Portuguese',
  fil: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
  zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  ps: 'Pashto', fa: 'Farsi', hi: 'Hindi', ko: 'Korean',
  th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
}

const SCENARIO_PROMPTS: Record<string, string> = {
  atm: `You are helping a foreigner use a Japanese ATM. You can see their screen. Guide them step by step in simple {LANG}. Identify each button/field by its Japanese text AND what it means. Be specific: "Tap the blue button labeled 振込 (furikomi/transfer) in the top-right corner." If you see an error, explain what went wrong.`,
  ticket: `You are helping a foreigner buy a train ticket at a Japanese ticket machine. Guide them step by step in {LANG}. Identify station names, fare amounts, and buttons. Mention if they should switch to English mode first.`,
  restaurant: `You are helping a foreigner order food at a Japanese restaurant tablet or ticket machine. Translate menu items, explain the ordering flow, identify buttons. Respond in {LANG}.`,
  post: `You are helping a foreigner fill out a form or use services at a Japanese post office. Read all fields, translate them, and explain what to write in each. Respond in {LANG}.`,
  hospital: `You are helping a foreigner fill out a hospital or clinic intake form in Japan. Translate each field, explain what information is needed (insurance card number, symptoms, allergies). Respond in {LANG}.`,
  government: `You are helping a foreigner navigate a Japanese city hall or government office form. Common forms: 転入届 (moving-in), 住民票 (resident registration), 国民健康保険 (health insurance). Translate every field and explain what to write. Respond in {LANG}.`,
  realestate: `You are helping a foreigner understand a Japanese real estate contract or apartment listing. Translate all terms, explain key conditions (敷金/deposit, 礼金/key money, 管理費/maintenance fee). Flag anything unusual. Respond in {LANG}.`,
  convenience: `You are helping a foreigner use convenience store services in Japan (paying bills, sending packages, printing, buying tickets). Read the screen and guide them step by step in {LANG}.`,
  transfer: `You are helping a foreigner make a bank transfer (振込) at a Japanese ATM or bank counter. Guide them step by step in {LANG}. Explain each field: recipient bank (銀行名), branch (支店), account type (普通/当座), account number (口座番号), amount (金額). Translate all on-screen text.`,
  checkout: `You are helping a foreigner use a self-checkout machine at a Japanese supermarket. Guide them step by step in {LANG}. Explain how to scan items, use the touchscreen, handle age-verified items, choose bags, and complete payment. Translate all on-screen text.`,
  custom: `You are helping a foreigner navigate something in Japan. Look at the image and explain everything you see in simple {LANG}. Identify all Japanese text and translate it. Guide them on what to do next.`,
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

    const { image, scenario, conversationHistory, question, language } = await req.json()

    if (!image && !question) {
      return NextResponse.json({ error: 'No image or question provided' }, { status: 400 })
    }

    const targetLang = LANG_NAMES[language] || 'English'
    const scenarioKey = scenario || 'custom'
    const basePrompt = (SCENARIO_PROMPTS[scenarioKey] || SCENARIO_PROMPTS.custom)
      .replace(/\{LANG\}/g, targetLang)

    const systemPrompt = `${basePrompt}

RULES:
- Give ONE clear, specific instruction for what to do NEXT
- Be specific about button locations (top-right, bottom-left, etc.)
- If you see input fields, tell them exactly what to type
- If you see amounts, translate them (e.g. ¥3,500 = about $23)
- Keep instructions concise but helpful — 2-4 sentences
- If this is a continuation, build on what you've already guided them through
- Always include the Japanese text AND its translation when referencing buttons/labels`

    // Build messages array with conversation history
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history (last 10 exchanges)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const entry of conversationHistory.slice(-10)) {
        if (entry.role === 'user') {
          const content: Anthropic.ContentBlockParam[] = []
          if (entry.image) {
            const b64 = entry.image.replace(/^data:image\/\w+;base64,/, '')
            content.push({
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
            })
          }
          if (entry.text) {
            content.push({ type: 'text', text: entry.text })
          }
          if (content.length > 0) messages.push({ role: 'user', content })
        } else if (entry.role === 'assistant') {
          messages.push({ role: 'assistant', content: entry.text })
        }
      }
    }

    // Add current message
    const currentContent: Anthropic.ContentBlockParam[] = []
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      currentContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64Data },
      })
    }
    currentContent.push({
      type: 'text',
      text: question || 'What am I looking at? What should I do next?',
    })
    messages.push({ role: 'user', content: currentContent })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Could not read the screen. Try moving closer.'

    return NextResponse.json({ instruction: text })
  } catch (error) {
    console.error('[live-guide]', error)
    return NextResponse.json({ error: 'Guide failed. Please try again.' }, { status: 500 })
  }
}
