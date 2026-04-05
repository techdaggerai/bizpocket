import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic, topicTarget, level, nativeLanguage } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

    const native = nativeLanguage || 'en'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are a Japanese language teacher creating immersive scenario-based lessons for foreigners living in Japan. Create realistic, practical scenarios that learners actually encounter.

Student level: ${level || 'beginner'}

Return ONLY valid JSON with this structure:
{
  "title": "At Mizuho Bank",
  "title_ja": "みずほ銀行で",
  "introduction": "You need to open a bank account. Let's practice the vocabulary and phrases you'll need.",
  "scenes": [
    {
      "scene_number": 1,
      "title": "Walking In",
      "setting": "The entrance of a large Japanese bank. A staff member stands near the door.",
      "dialogue": {
        "speaker": "Bank Staff",
        "japanese": "いらっしゃいませ。本日はどのようなご用件でしょうか。",
        "reading": "いらっしゃいませ。ほんじつは どのような ごようけん でしょうか。",
        "translation": "Welcome. How can we help you today?"
      },
      "new_words": [
        {
          "word": "ご用件",
          "reading": "ごようけん",
          "meaning": "your business/purpose",
          "difficulty": 3
        }
      ],
      "practice_prompt": "How would you say 'I'd like to open a bank account'?",
      "practice_answer": {
        "japanese": "口座を開設したいのですが。",
        "reading": "こうざを かいせつ したいのですが。",
        "translation": "I'd like to open a bank account."
      },
      "cultural_note": "Always end requests with のですが or んですが — it sounds softer and more polite than a direct statement."
    }
  ],
  "quiz": [
    {
      "question": "How do you say 'bank account' in Japanese?",
      "answer": "口座",
      "reading": "こうざ",
      "hint": "The first kanji means 'mouth/opening'"
    }
  ]
}

Rules:
- Create 4-5 scenes that tell a connected story
- Each scene teaches 2-3 new words with readings
- Practice prompts should require the student to PRODUCE Japanese (type it), not just recognize
- Cultural notes add real-world context foreigners in Japan need
- Quiz should have 3-4 questions testing the words learned
- For beginners: more hiragana, simpler phrases, more translation help
- For intermediate/advanced: more kanji, compound phrases, keigo`,
      messages: [{
        role: 'user',
        content: `Create a scenario-based lesson for: "${topic}" (${topicTarget || ''})`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    let lesson = null
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) lesson = JSON.parse(match[0])
    } catch {
      lesson = null
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Scenario lesson error:', error)
    return NextResponse.json({ error: 'Failed to generate lesson' }, { status: 500 })
  }
}
