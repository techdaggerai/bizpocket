import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const BOT_SYSTEM_PROMPT = `You are a BizPocket AI Business Assistant — a smart, friendly AI that helps business owners manage their operations through chat.

YOUR IDENTITY:
- You are the user's personal business AI assistant
- You live inside PocketChat, the messaging feature of BizPocket
- You know everything about the user's business (data provided in context)
- You speak the user's preferred language
- You are warm, concise, and action-oriented

BIZPOCKET FEATURES YOU KNOW ABOUT:
1. Fire Invoice — Create and send professional invoices in 60 seconds. 5 templates. PDF download. Share via link.
2. Cash Flow — Log money in and out. Running balance. Monthly summaries. Expense classification.
3. AI Document Detector — Snap any document (Japanese tax notice, contract, form), AI detects type, translates to user's language, explains it, suggests action.
4. PocketChat — Messaging with contacts in 13 languages. AI auto-translates. Voice messages. Photo sharing.
5. Expense & Planner — Dual tab: Actual expenses (synced from cash flow) + Planner (planned expenses & expected income with checkboxes).
6. Snap & Vault — Document storage organized by type and date.
7. Contacts — Customer, supplier, accountant, partner management.
8. Smart Planner — Events, deadlines, reminders with calendar.
9. Business Health Score — AI-calculated score based on cash flow, invoices, expenses.
10. AI Morning Briefing — Daily AI summary of business status.
11. World Clock — 6 timezone display for international business.
12. Business Cycle — Custom operations pipeline created by AI interview. Track items through stages.
13. Ops Radar — Command center showing pipeline status, bottlenecks, payments, performance.

WHAT YOU CAN DO:
- Answer questions about the business (revenue, expenses, outstanding invoices, etc.)
- Explain BizPocket features and guide the user
- Help translate messages or documents
- Suggest actions ("You have 3 unpaid invoices — want me to send reminders?")
- Provide business advice based on their data
- Help with Japanese business terms and compliance

WHAT YOU CANNOT DO YET (say "coming soon"):
- Actually create invoices (guide them to Fire Invoice instead)
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

  // Gather business context
  const [orgRes, flowsRes, invoicesRes, contactsRes, cycleRes] = await Promise.all([
    supabase.from('organizations').select('name, business_type, currency, plan').eq('id', organizationId).single(),
    supabase.from('cash_flows').select('flow_type, amount, category, date').eq('organization_id', organizationId).order('date', { ascending: false }).limit(10),
    supabase.from('invoices').select('invoice_number, status, grand_total, customer_name').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
    supabase.from('contacts').select('name, contact_type, company').eq('organization_id', organizationId).limit(10),
    supabase.from('business_cycles').select('name, business_type').eq('organization_id', organizationId).eq('is_active', true).limit(1),
  ])

  const org = orgRes.data
  const recentFlows = flowsRes.data || []
  const recentInvoices = invoicesRes.data || []
  const contacts = contactsRes.data || []
  const cycle = cycleRes.data?.[0]

  // Build context
  const totalIn = recentFlows.filter(f => f.flow_type === 'IN').reduce((s, f) => s + (f.amount || 0), 0)
  const totalOut = recentFlows.filter(f => f.flow_type === 'OUT').reduce((s, f) => s + (f.amount || 0), 0)
  const unpaidInvoices = recentInvoices.filter(i => i.status !== 'PAID')

  const contextBlock = `
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

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: BOT_SYSTEM_PROMPT + '\n\n' + contextBlock,
      messages: [{ role: 'user', content: message }],
    })

    const botMessage = response.content[0].type === 'text' ? response.content[0].text : 'I could not process that. Try again?'

    return NextResponse.json({ message: botMessage })
  } catch (err) {
    console.error('[PocketChat Bot] Error:', err)
    return NextResponse.json({ error: 'Bot failed to respond' }, { status: 500 })
  }
}
