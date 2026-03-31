import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  const businessName = formData.get('businessName') as string || ''
  const businessType = formData.get('businessType') as string || ''
  const platform = formData.get('platform') as string || 'instagram'
  const mood = formData.get('mood') as string || 'professional'
  const language = formData.get('language') as string || 'en'
  const description = formData.get('description') as string || ''

  let imageContent: Anthropic.Messages.ImageBlockParam | null = null

  if (image && image.size > 0) {
    const buffer = await image.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    imageContent = {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    }
  }

  const langMap: Record<string, string> = { en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', pt: 'Portuguese', es: 'Spanish', fr: 'French', zh: 'Chinese', tr: 'Turkish', vi: 'Vietnamese' }

  const systemPrompt = `You are a social media expert for small businesses. Generate engaging content.

RESPOND WITH JSON ONLY. No markdown. No backticks.

{
  "caption": "The main post caption (2-3 sentences, engaging, with a call to action)",
  "hashtags": ["hashtag1", "hashtag2", ... up to 15 relevant hashtags without # symbol],
  "alt_captions": ["Alternative caption 1", "Alternative caption 2"],
  "photo_tips": "If a photo was provided, give 1-2 tips to improve it. If not, suggest what photo to take.",
  "best_time": "Suggest best time to post for maximum engagement",
  "story_idea": "A short Instagram Story idea related to this post"
}

RULES:
- Tone: ${mood}
- Write in ${langMap[language] || 'English'}
- Platform: ${platform} (Instagram = visual + hashtags, Facebook = storytelling, TikTok = trendy + short)
- Business: ${businessName} (${businessType})
- Include emojis naturally
- Mix popular and niche hashtags`

  const userContent: Anthropic.Messages.ContentBlockParam[] = [
    ...(imageContent ? [imageContent] : []),
    {
      type: 'text' as const,
      text: description
        ? `Generate social media content for: ${description}`
        : imageContent
          ? 'Generate social media content for this photo.'
          : `Generate a social media post idea for "${businessName}" (${businessType}).`,
    },
  ]

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let result
    try {
      const cleaned = rawText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        result = match ? JSON.parse(match[0]) : { caption: rawText, hashtags: [], alt_captions: [], photo_tips: '', best_time: '', story_idea: '' }
      } catch {
        result = { caption: rawText, hashtags: [], alt_captions: [], photo_tips: '', best_time: '', story_idea: '' }
      }
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[Social Media AI] Error:', err)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
