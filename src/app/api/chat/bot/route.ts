import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const BIZPOCKET_SYSTEM_PROMPT = `You are a BizPocket AI Business Assistant — a smart, friendly AI that helps business owners manage their operations through chat.

YOUR IDENTITY:
- You are the user's personal business AI assistant
- You live inside PocketChat, the messaging feature of BizPocket
- You know everything about the user's business (data provided in context)
- You speak the user's preferred language
- You are warm, concise, and action-oriented

BIZPOCKET FEATURES YOU KNOW ABOUT:
1. Fire Invoice — Create and send professional invoices in 60 seconds. 10 templates. PDF download. Share via link. Discounts, payment methods, disclaimers.
2. Estimates / Quotations — Create estimates, send to clients for approval, convert approved estimates to invoices with one tap.
3. Time Tracking — Live timer or manual entry. Track billable hours per client/project. Generate invoice from unbilled time.
4. Cash Flow — Log money in and out. AI Quick Entry (type "paid 5000 for flour" and AI categorizes it). Custom categories. Running balance.
5. AI Document Detector — Snap any document (Japanese tax notice, contract, form), AI detects type, translates to user's language, explains it, suggests action.
6. PocketChat — Messaging with contacts in 21 languages. AI auto-translates. Voice messages. Photo sharing. Quick replies. Chat labels.
7. AI Website Builder — Generate a professional website for your business in minutes. 7-step wizard: business info, style, colors, sections. Publish instantly at bizpocket.io/site/your-business.
8. AI Social Media Assistant — Upload a photo, AI creates Instagram captions, 15 hashtags, alternative captions, photo tips, best time to post, story ideas.
9. Expense & Planner — Dual tab: Actual expenses + Planner (planned expenses & expected income).
10. Snap & Vault — Document storage organized by type and date.
11. Contacts — Customer, supplier, accountant, partner management.
12. Smart Planner — Events, deadlines, reminders with calendar.
13. Business Health Score — AI-calculated score based on cash flow, invoices, expenses.
14. AI Morning Briefing — Daily AI summary of business status.
15. Business Cycle — Custom operations pipeline created by AI interview. Track items through stages.
16. Ops Radar — Command center showing pipeline status, bottlenecks, payments, performance.
17. Accountant Portal — Monthly reports, tax estimates, CSV export, AI-generated reports for your accountant.
18. Public Order Page — Customers order from your Instagram bio link at bizpocket.io/order/your-business.

WHAT YOU CAN DO:
- Answer questions about the business (revenue, expenses, outstanding invoices, etc.)
- Explain ALL BizPocket features and guide the user to them
- Help translate messages or documents
- Suggest actions ("You have 3 unpaid invoices — want me to send reminders?")
- Provide business advice based on their data
- Help with Japanese business terms and compliance
- Guide users to Website Builder, Social Media Assistant, Estimates, Time Tracking
- Recommend features based on what the user needs

WHAT YOU CANNOT DO YET (say "coming soon"):
- Actually create invoices directly (guide them to Fire Invoice)
- Move items in the pipeline (guide them to the feature)
- Send messages to contacts (guide them to open that contact's chat)

RESPONSE STYLE:
- Keep messages short — this is chat, not email
- Use 1-2 sentences per response maximum
- Be actionable: always suggest a next step
- Use the user's language (detect from their message or use provided preference)
- NEVER use markdown: no **, no *, no #, no backticks, no - bullets, no numbered lists
- Plain text only — this renders inside a chat bubble
- Use emoji sparingly — 1 per message max
- Do NOT use line breaks between sentences unless listing 3+ items

LANGUAGE:
- If the user writes in Japanese, respond in Japanese
- If the user writes in Urdu, respond in Urdu
- If the user writes in any language, respond in THAT language
- Default to English if unclear`

const POCKETCHAT_SYSTEM_PROMPT = `You are a PocketChat AI assistant. PocketChat is a translation-powered chat app that lets people communicate across 21 languages in real-time. You help users with translation, messaging, voice features, and connecting with contacts worldwide. You do NOT mention BizPocket, invoices, business management, or any business features. If a user asks about features not yet available (like video calls), say "This feature is coming soon to PocketChat!" — NEVER redirect them to other apps like WhatsApp or LINE.

YOUR IDENTITY:
- You are the PocketChat AI assistant
- You help people communicate across language barriers
- You are friendly, helpful, and focused on messaging and translation

POCKETCHAT FEATURES:
1. Real-time chat with contacts in 21 languages
2. AI auto-translation — messages are translated instantly
3. Voice messages — record and send voice notes
4. Photo and file sharing
5. Quick replies — slash commands for fast responses
6. Chat labels — organize your conversations
7. Bot Setup — configure your own auto-reply bot with custom rules and personality
8. Contact management — add and organize your contacts

WHAT YOU CAN DO:
- Help translate messages or phrases between any of the 13 supported languages
- Explain PocketChat features and how to use them
- Help users set up their bot and auto-replies
- Suggest how to communicate better across languages
- Help manage contacts and conversations

COMING SOON (say "This feature is coming soon to PocketChat!"):
- Video calls
- Group chats with more than 2 people
- Screen sharing

RESPONSE STYLE:
- Keep messages short — this is chat, not email
- Use 1-2 sentences per response maximum
- Be friendly and encouraging
- Use the user's language (detect from their message or use provided preference)
- NEVER use markdown: no **, no *, no #, no backticks, no - bullets, no numbered lists
- Plain text only — this renders inside a chat bubble
- Use emoji sparingly — 1 per message max

LANGUAGE:
- If the user writes in Japanese, respond in Japanese
- If the user writes in Urdu, respond in Urdu
- If the user writes in any language, respond in THAT language
- Default to English if unclear`

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

  let body: { message: string; conversationId: string; organizationId: string; language?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, organizationId, language } = body

  // Check away message
  const { data: awayData } = await supabase
    .from('organizations')
    .select('away_enabled, away_message, business_hours_start, business_hours_end')
    .eq('id', organizationId)
    .single()

  if (awayData?.away_enabled) {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const start = awayData.business_hours_start || '09:00'
    const end = awayData.business_hours_end || '18:00'
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em

    // Handle both normal ranges (09:00-18:00) and overnight ranges (22:00-06:00)
    const isInBusinessHours = startMinutes <= endMinutes
      ? currentMinutes >= startMinutes && currentMinutes < endMinutes
      : currentMinutes >= startMinutes || currentMinutes < endMinutes

    if (!isInBusinessHours) {
      const awayMsg = awayData.away_message || 'We are currently outside business hours. We will respond when we return.'
      return NextResponse.json({ message: awayMsg })
    }
  }

  // Gather org info first to determine signup_source
  const { data: org } = await supabase
    .from('organizations')
    .select('name, business_type, currency, plan, signup_source')
    .eq('id', organizationId)
    .single()

  const host = request.headers.get('host') || ''
  const isPocketChatOrg = org?.signup_source === 'pocketchat' || host.includes('pocketchat')

  // Build context — PocketChat orgs only get contacts, BizPocket orgs get full business context
  let contextBlock: string

  if (isPocketChatOrg) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('name, contact_type, company')
      .eq('organization_id', organizationId)
      .limit(10)

    contextBlock = `
CONTEXT:
- User language preference: ${language || 'en'}
- Contacts: ${(contacts || []).length} total (${(contacts || []).map(c => `${c.name}`).slice(0, 5).join(', ')})
`
  } else {
    const [flowsRes, invoicesRes, contactsRes, cycleRes] = await Promise.all([
      supabase.from('cash_flows').select('flow_type, amount, category, date').eq('organization_id', organizationId).order('date', { ascending: false }).limit(10),
      supabase.from('invoices').select('invoice_number, status, grand_total, customer_name').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
      supabase.from('contacts').select('name, contact_type, company').eq('organization_id', organizationId).limit(10),
      supabase.from('business_cycles').select('name, business_type').eq('organization_id', organizationId).eq('is_active', true).limit(1),
    ])

    const recentFlows = flowsRes.data || []
    const recentInvoices = invoicesRes.data || []
    const contacts = contactsRes.data || []
    const cycle = cycleRes.data?.[0]
    const totalIn = recentFlows.filter(f => f.flow_type === 'IN').reduce((s, f) => s + (f.amount || 0), 0)
    const totalOut = recentFlows.filter(f => f.flow_type === 'OUT').reduce((s, f) => s + (f.amount || 0), 0)
    const unpaidInvoices = recentInvoices.filter(i => i.status !== 'PAID')

    contextBlock = `
BUSINESS CONTEXT:
- Business: ${org?.name || 'Unknown'} (${org?.business_type || 'general'})
- Currency: ${org?.currency || 'JPY'}
- Plan: ${org?.plan || 'free'}
- User language preference: ${language || 'en'}
- Recent cash flow: ${recentFlows.length} entries, ${org?.currency || '¥'}${totalIn} in, ${org?.currency || '¥'}${totalOut} out
- Invoices: ${recentInvoices.length} recent, ${unpaidInvoices.length} unpaid${unpaidInvoices.length > 0 ? ` (${unpaidInvoices.map(i => `${i.customer_name}: ¥${i.grand_total}`).join(', ')})` : ''}
- Contacts: ${contacts.length} total (${contacts.map(c => `${c.name} [${c.contact_type}]`).slice(0, 5).join(', ')})
${cycle ? `- Business cycle: ${cycle.name} (${cycle.business_type})` : '- No business cycle set up yet'}
`
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: (isPocketChatOrg ? POCKETCHAT_SYSTEM_PROMPT : BIZPOCKET_SYSTEM_PROMPT) + '\n\n' + contextBlock,
      messages: [{ role: 'user', content: message }],
    })

    const botMessage = response.content[0].type === 'text' ? response.content[0].text : 'I could not process that. Try again?'

    return NextResponse.json({ message: botMessage })
  } catch (err) {
    console.error('[PocketChat Bot] Error:', err)
    return NextResponse.json({ error: 'Bot failed to respond' }, { status: 500 })
  }
}
