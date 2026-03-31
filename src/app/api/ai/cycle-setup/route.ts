import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are BizPocket AI — a business operations architect. You help business owners define their operational workflow through a friendly conversation.

Your job is to understand the user's business and create a BUSINESS CYCLE — the stages their products/services/items flow through from start to finish.

CONVERSATION FLOW:
1. Ask what their business does (if not already clear)
2. Ask them to walk through what happens from start to finish — from when they first get/create something to when they get paid
3. Ask about key people involved
4. Generate the cycle stages

RULES:
- Be warm, conversational, encouraging
- Ask ONE question at a time
- Keep it simple — they're busy business owners, not engineers
- After 3-5 exchanges, you should have enough to generate the cycle
- When ready, generate the cycle

RESPONSE FORMAT:
Always respond with valid JSON only. No markdown. No backticks.

For conversation turns:
{
  "type": "message",
  "message": "Your conversational response here",
  "ready_to_generate": false
}

When you have enough info to generate the cycle:
{
  "type": "cycle",
  "message": "Here's your business cycle based on what you told me:",
  "cycle_name": "Name of the pipeline",
  "business_type": "type_identifier",
  "stages": [
    {"name": "Stage Name", "order": 1, "color": "#hex", "is_start": true, "is_end": false, "description": "What happens here"},
    {"name": "Stage Name", "order": 2, "color": "#hex", "is_start": false, "is_end": false, "description": "What happens here"},
    ...
  ],
  "ready_to_generate": true
}

Use these colors for stages (cycle through them):
#4F46E5 (indigo), #16A34A (green), #0EA5E9 (sky), #F59E0B (amber), #EC4899 (pink), #7C3AED (purple), #14B8A6 (teal), #EF4444 (red), #F97316 (orange), #06B6D4 (cyan), #8B5CF6 (violet), #10B981 (emerald)

Keep stage count between 5-12. First stage is_start=true, last stage is_end=true.`

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

  let body: { messages: { role: string; content: string }[]; organizationId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { messages, organizationId } = body
  if (!messages || !organizationId) {
    return NextResponse.json({ error: 'Missing messages or organizationId' }, { status: 400 })
  }

  // Get org info for context
  const { data: org } = await supabase
    .from('organizations')
    .select('name, business_type, currency')
    .eq('id', organizationId)
    .single()

  const contextMsg = org
    ? `Business name: ${org.name}. Type: ${org.business_type || 'not specified'}. Currency: ${org.currency || 'JPY'}.`
    : ''

  try {
    const anthropic = new Anthropic({ apiKey })

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Inject context into first user message
    if (apiMessages.length > 0 && contextMsg) {
      apiMessages[0].content = `[Context: ${contextMsg}]\n\n${apiMessages[0].content}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let result
    try {
      // Multiple cleaning strategies
      let cleaned = rawText.trim()

      // Remove markdown code fences (```json ... ``` or ``` ... ```)
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

      // If still not starting with {, try to extract JSON from the text
      if (!cleaned.startsWith('{')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleaned = jsonMatch[0]
        }
      }

      result = JSON.parse(cleaned)
    } catch {
      // Final fallback: try to find JSON anywhere in the raw text
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*"type"\s*:\s*"(?:cycle|message)"[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          result = {
            type: 'message',
            message: rawText.replace(/```json\s*|```\s*/g, '').trim(),
            ready_to_generate: false,
          }
        }
      } catch {
        result = {
          type: 'message',
          message: rawText.replace(/```json\s*|```\s*/g, '').trim(),
          ready_to_generate: false,
        }
      }
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[BizPocket AI] Cycle setup failed:', err)
    return NextResponse.json({ error: 'AI failed' }, { status: 500 })
  }
}
