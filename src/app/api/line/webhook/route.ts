import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getLineToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN!
}

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return hash === signature
}

async function lineReply(replyToken: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getLineToken()}` },
    body: JSON.stringify({ replyToken, messages }),
  })
}

async function linePush(userId: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getLineToken()}` },
    body: JSON.stringify({ to: userId, messages }),
  })
}

async function translateMessage(text: string, fromLang: string, toLang: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const keigoNote = toLang.toLowerCase() === 'japanese'
    ? ' Use appropriate keigo (polite business Japanese).'
    : ''
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are a professional translator. Translate the following from ${fromLang} to ${toLang}.${keigoNote} Return ONLY the translation, nothing else.`,
    messages: [{ role: 'user', content: text }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : text
}

async function getLineProfile(userId: string) {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${getLineToken()}` },
  })
  return res.ok ? res.json() : { displayName: 'User', pictureUrl: null }
}

// ── Slash command handlers ──

async function handleCommand(command: string, replyToken: string): Promise<boolean> {
  const cmd = command.toLowerCase().trim()

  if (cmd === '/translate') {
    await lineReply(replyToken, [
      { type: 'text', text: '🌐 Send me any message and I\'ll translate it!\n\nメッセージを送ってください。翻訳します！' },
    ])
    return true
  }

  if (cmd === '/scan') {
    await lineReply(replyToken, [{
      type: 'flex', altText: 'Document Scanner',
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '📄 Document Scanner', weight: 'bold', size: 'lg', color: '#4F46E5' },
            { type: 'text', text: 'Send me a photo of any document and I\'ll translate it!', wrap: true, size: 'sm', color: '#475569' },
            { type: 'text', text: '書類の写真を送ってください。翻訳します！', wrap: true, size: 'sm', color: '#64748B' },
          ],
        },
      },
    }])
    return true
  }

  if (cmd === '/invoice') {
    await lineReply(replyToken, [{
      type: 'flex', altText: 'Create Invoice',
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '🧾 Create Invoice', weight: 'bold', size: 'lg', color: '#4F46E5' },
            { type: 'text', text: 'Open BizPocket to create and send invoices.', wrap: true, size: 'sm' },
          ],
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button',
            action: { type: 'uri', label: 'Open BizPocket', uri: 'https://bizpocket.io/invoices' },
            style: 'primary', color: '#4F46E5',
          }],
        },
      },
    }])
    return true
  }

  if (cmd === '/card') {
    await lineReply(replyToken, [{
      type: 'flex', altText: 'Business Card Scanner',
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '💳 Business Card Scanner', weight: 'bold', size: 'lg', color: '#4F46E5' },
            { type: 'text', text: 'Send a photo of a business card to scan and save it.', wrap: true, size: 'sm' },
            { type: 'text', text: '名刺の写真を送ってください。スキャンして保存します！', wrap: true, size: 'sm', color: '#64748B' },
          ],
        },
      },
    }])
    return true
  }

  return false
}

// ── Text message handler ──

async function handleTextMessage(event: any) {
  const lineUserId = event.source.userId
  const messageText = event.message.text
  const replyToken = event.replyToken

  console.log(`[LINE] message from ${lineUserId}: ${messageText.substring(0, 50)}`)

  // Handle slash commands first
  if (messageText.startsWith('/')) {
    const handled = await handleCommand(messageText, replyToken)
    if (handled) return
  }

  // Reply immediately with "translating..." then push result
  // (LINE webhook must respond within 1 second)
  await lineReply(replyToken, [
    { type: 'text', text: '🔄 翻訳中... Translating...' },
  ])

  // Get or create thread
  let { data: thread } = await getSupabase()
    .from('line_threads')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single()

  if (!thread) {
    const profile = await getLineProfile(lineUserId)
    const { data: newThread } = await getSupabase()
      .from('line_threads')
      .insert({
        line_user_id: lineUserId,
        line_display_name: profile.displayName,
        line_picture_url: profile.pictureUrl,
        language: 'ja',
      })
      .select()
      .single()
    thread = newThread
  }

  await getSupabase()
    .from('line_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId)

  // Translate Japanese → English
  const translated = await translateMessage(messageText, 'Japanese', 'English')

  // Push the translation result (since we already used replyToken)
  await linePush(lineUserId, [{
    type: 'flex',
    altText: `Translation: ${translated}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: '🌐 Translation', size: 'xs', color: '#4F46E5', weight: 'bold' },
          { type: 'text', text: translated, size: 'md', wrap: true, color: '#1E293B', weight: 'bold' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `Original: ${messageText}`, size: 'xs', color: '#64748B', wrap: true, margin: 'md' },
        ],
      },
      styles: { body: { backgroundColor: '#F8FAFC' } },
    },
  }])

  // Store in Evrywher chat if linked
  if (thread?.evrywher_chat_id) {
    await getSupabase().from('messages').insert({
      conversation_id: thread.evrywher_chat_id,
      organization_id: thread.evrywher_user_id,
      sender_type: 'contact',
      sender_name: thread.line_display_name || 'LINE User',
      message: messageText,
      original_text: messageText,
      original_language: 'ja',
      translations: { ja: messageText, en: translated },
      message_type: 'text',
    })
  }
}

// ── Image message handler ──

async function handleImageMessage(event: any) {
  const lineUserId = event.source.userId
  const messageId = event.message.id
  const replyToken = event.replyToken

  console.log(`[LINE] image from ${lineUserId}: ${messageId}`)

  // Reply immediately
  await lineReply(replyToken, [
    { type: 'text', text: '📄 スキャン中... Scanning document...' },
  ])

  // Get image from LINE
  const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${getLineToken()}` },
  })
  const imageBuffer = await imageRes.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  // Send to Claude Vision
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
        { type: 'text', text: 'Extract all text from this image. Translate everything to English. Return format:\n\nOriginal:\n[original text]\n\nTranslation:\n[translated text]' },
      ],
    }],
  })

  const result = response.content[0].type === 'text' ? response.content[0].text : 'Could not process image'

  await linePush(lineUserId, [{
    type: 'flex', altText: 'Document Translation',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '📄 Document Translation', weight: 'bold', color: '#4F46E5' },
          { type: 'text', text: result, wrap: true, size: 'sm', color: '#1E293B' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button',
          action: { type: 'uri', label: 'Open in Evrywher', uri: 'https://evrywher.io' },
          style: 'primary', color: '#4F46E5',
        }],
      },
    },
  }])
}

// ── Follow event handler ──

async function handleFollow(event: any) {
  const lineUserId = event.source.userId
  const replyToken = event.replyToken

  console.log(`[LINE] follow from ${lineUserId}`)

  const profile = await getLineProfile(lineUserId)

  await getSupabase().from('line_threads').upsert({
    line_user_id: lineUserId,
    line_display_name: profile.displayName,
    line_picture_url: profile.pictureUrl,
  })

  await lineReply(replyToken, [{
    type: 'flex', altText: 'Welcome to Evrywher!',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: 'Evrywher へようこそ！🌏', size: 'lg', weight: 'bold', color: '#4F46E5' },
          { type: 'text', text: 'AI翻訳でどんな言語でもリアルタイムでチャットできます。メッセージを送ってみてください！', size: 'sm', wrap: true, color: '#475569' },
          { type: 'text', text: 'Welcome! Chat in any language — AI translates in real-time. Send a message to try!', size: 'sm', wrap: true, color: '#64748B', margin: 'md' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button',
          action: { type: 'uri', label: 'Open Evrywher App', uri: 'https://evrywher.io' },
          style: 'primary', color: '#4F46E5',
        }],
      },
    },
  }])
}

// ── Main webhook handler ──

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  if (!verifySignature(body, signature)) {
    console.log('[LINE] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(body)
  const events = data.events || []

  // Process each event independently — one failure doesn't kill the batch
  for (const event of events) {
    try {
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event)
      } else if (event.type === 'message' && event.message.type === 'image') {
        await handleImageMessage(event)
      } else if (event.type === 'follow') {
        await handleFollow(event)
      } else {
        console.log(`[LINE] Unhandled event: ${event.type}`)
      }
    } catch (error) {
      console.error(`[LINE] Error processing ${event.type}:`, error)
      // Try to send error reply if we have a replyToken
      if (event.replyToken) {
        try {
          await linePush(event.source?.userId, [
            { type: 'text', text: 'Sorry, there was an error. Please try again.\n申し訳ございません。もう一度お試しください。' },
          ])
        } catch { /* ignore reply errors */ }
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}
