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

    const { topic, topicTarget, description, difficulty, count } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

    const wordCount = Math.min(count || 15, 30)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are a Japanese language teacher creating vocabulary lists for foreigners living in Japan. Generate practical, real-world vocabulary that people actually encounter in daily life.

Return ONLY a valid JSON array of word objects. No other text.

Each word object:
{
  "word": "振込",
  "reading": "furikomi",
  "meaning": "bank transfer",
  "difficulty": 2,
  "example": "ATMで振込をしたいのですが。",
  "example_translation": "I'd like to make a bank transfer at the ATM."
}

Rules:
- Focus on words commonly seen/heard in the specific context
- Include both kanji and katakana words where relevant
- Example sentences should be practical — things you'd actually say or read
- Difficulty: 1=JLPT N5, 2=N4, 3=N3, 4=N2, 5=N1
- For ${difficulty} level, adjust the complexity accordingly
- Reading in hiragana for kanji words, romaji acceptable for katakana`,
      messages: [{
        role: 'user',
        content: `Generate ${wordCount} vocabulary words for the topic: "${topic}" (${topicTarget}).\nContext: ${description}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    let words = []
    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) words = JSON.parse(match[0])
    } catch {
      words = []
    }

    return NextResponse.json({ words })
  } catch (error) {
    console.error('Topic words generation error:', error)
    return NextResponse.json({ error: 'Failed to generate words' }, { status: 500 })
  }
}
