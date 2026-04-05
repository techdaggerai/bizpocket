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

    const { text, context, sourceType, sourceId, targetLanguage, nativeLanguage } = await req.json()
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

    const target = targetLanguage || 'ja'
    const native = nativeLanguage || 'en'

    const LANG_NAMES: Record<string, string> = {
      en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', ko: 'Korean',
      zh: 'Chinese', fr: 'French', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi',
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a language learning assistant. Extract 2-4 key vocabulary words from the given text that would be most useful for a foreigner living in Japan to learn. Focus on practical, commonly encountered words.

Return ONLY valid JSON array:
[{
  "word": "振込",
  "reading": "furikomi",
  "meaning": "bank transfer",
  "difficulty": 2,
  "example": "振込手数料は330円です。",
  "example_translation": "The transfer fee is 330 yen."
}]

Rules:
- Skip very common particles (は, が, を, の) and basic verbs (する, です, ある) unless user is absolute beginner
- Include the reading in romaji or hiragana
- Meaning should be in ${LANG_NAMES[native] || 'English'}
- Difficulty 1-5 (1=N5 beginner, 5=N1 advanced)
- Use an example sentence from the original text when possible
- If text is too short or has no learnable words, return empty array []`,
      messages: [{ role: 'user', content: `Extract vocabulary from this ${LANG_NAMES[target] || target} text:\n\n${text}` }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    let words: Array<{ word: string; reading: string; meaning: string; difficulty: number; example: string; example_translation: string }> = []

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (jsonMatch) words = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ vocabulary: [], saved: 0 })
    }

    if (words.length === 0) return NextResponse.json({ vocabulary: [], saved: 0 })

    // Check for duplicates — don't re-add words user already has
    const { data: existing } = await supabase
      .from('vocabulary')
      .select('word')
      .eq('user_id', user.id)
      .in('word', words.map(w => w.word))

    const existingSet = new Set(existing?.map(e => e.word) || [])
    const newWords = words.filter(w => !existingSet.has(w.word))

    if (newWords.length > 0) {
      const rows = newWords.map(w => ({
        user_id: user.id,
        word: w.word,
        reading: w.reading,
        meaning: w.meaning,
        example_sentence: w.example,
        example_translation: w.example_translation,
        difficulty: w.difficulty || 1,
        context: context || null,
        source: sourceType || 'translation',
        source_id: sourceId || null,
        next_review_at: new Date().toISOString(),
        mastery_level: 0,
      }))

      await supabase.from('vocabulary').insert(rows)

      // Update learning profile total
      await supabase.rpc('increment_words_learned', {
        p_user_id: user.id,
        p_count: newWords.length,
      }).catch(() => {
        // RPC may not exist yet, update directly
        supabase.from('learning_profiles')
          .update({ total_words_learned: newWords.length })
          .eq('user_id', user.id)
      })
    }

    return NextResponse.json({
      vocabulary: words,
      saved: newWords.length,
      duplicates: words.length - newWords.length,
    })
  } catch (error) {
    console.error('Vocabulary extraction error:', error)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
