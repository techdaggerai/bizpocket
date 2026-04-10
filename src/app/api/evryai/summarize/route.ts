import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// In-memory rate limiter: 10 requests per minute per user
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) || []
  const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
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

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { messages, contactName } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Build transcript from last 50 messages
    const transcript = messages
      .filter((m: { deleted_at?: string }) => !m.deleted_at)
      .slice(-50)
      .map((m: { sender_type: string; sender_name: string; message: string; created_at: string }) => {
        const who = m.sender_type === 'owner' ? 'You' : (m.sender_name || contactName || 'Contact')
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return `[${time}] ${who}: ${m.message}`
      })
      .join('\n')

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are a conversation summarizer. Summarize the chat between the user and the contact. Include:
1) A brief overview (2-3 sentences)
2) Key topics discussed
3) Any action items or decisions made
4) Important dates/times mentioned
5) Tone/sentiment of the conversation

Keep it concise and useful. Format with clear sections using markdown-style headers (##).`,
      messages: [{
        role: 'user',
        content: `Conversation with ${contactName || 'contact'}:\n\n${transcript}`,
      }],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : 'Unable to summarize.'

    return NextResponse.json({ summary, messageCount: messages.length })
  } catch (error) {
    console.error('[summarize]', error)
    return NextResponse.json({ error: 'Failed to summarize conversation' }, { status: 500 })
  }
}
