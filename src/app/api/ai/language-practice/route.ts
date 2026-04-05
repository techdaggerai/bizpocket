import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', ko: 'Korean',
  zh: 'Chinese', fr: 'French', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi',
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, level, topic, topicVocabulary, targetLanguage, nativeLanguage } = await req.json()
    if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'Missing messages' }, { status: 400 })

    const target = LANG_NAMES[targetLanguage || 'ja'] || 'Japanese'
    const native = LANG_NAMES[nativeLanguage || 'en'] || 'English'
    const vocabList = topicVocabulary?.join(', ') || ''

    const systemPrompt = `You are a friendly ${target} language tutor inside the Evrywher language learning app.

Student level: ${level || 'beginner'}
Topic: ${topic || 'General conversation'}
Native language: ${native}
${vocabList ? `Key vocabulary to practice: ${vocabList}` : ''}

Rules:
- Speak in ${target} appropriate for their level
- After each ${target} line, provide the ${native} translation in parentheses on a new line
- If student writes in ${native}, show them the ${target} first, then continue the conversation
- Gently correct mistakes with positive encouragement — use "✏️" for corrections
- Keep responses SHORT — 1-3 sentences max (mobile screen)
- Add reading/pronunciation for non-Latin scripts: 振込(ふりこみ)
- After 4-5 exchanges, introduce 1 new vocabulary word with "📚 New word:" prefix
- If student makes a grammar mistake, correct it naturally:
  "✏️ Small tip: おにぎり → おにぎりを (add を particle for the object)"

For beginners: use hiragana primarily, simple sentences, lots of ${native} help
For elementary: basic kanji with readings, short conversations
For intermediate: mix kanji with furigana, compound sentences, less ${native}
For advanced: natural ${target}, minimal ${native}, nuanced corrections

Start the conversation by greeting the student in ${target} and setting the scene for the topic.
Never break character. Always stay in the practice conversation.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Language practice error:', error)
    return NextResponse.json({ error: 'Practice failed' }, { status: 500 })
  }
}
