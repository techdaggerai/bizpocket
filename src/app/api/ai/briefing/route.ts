import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are BizPocket AI — a business autopilot for foreign entrepreneurs in Japan. Generate a sharp, concise morning briefing in 3-4 bullet points.
Be specific with numbers. Recommend one action.
Tone: direct, like a trusted business partner.
Never generic. Always data-driven.
Format: plain text with bullet points using "•" character. No markdown headers. No bold (**), no italic (*), no asterisks at all. Keep it under 200 words.
If there's no data yet, give a warm welcome and suggest first steps.`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { briefing: null, error: 'AI not configured' },
      { status: 200 }
    )
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
    return NextResponse.json({ briefing: null, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { organizationId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ briefing: null, error: 'Invalid request' }, { status: 400 })
  }

  const orgId = body.organizationId
  if (!orgId) {
    return NextResponse.json({ briefing: null, error: 'Missing organizationId' }, { status: 400 })
  }

  // Pull business data
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [orgRes, profileRes, flowsRes, invoicesRes, expensesRes] = await Promise.all([
    supabase.from('organizations').select('name, business_type, currency, plan').eq('id', orgId).single(),
    supabase.from('profiles').select('name, role').eq('user_id', user.id).eq('organization_id', orgId).single(),
    supabase.from('cash_flows').select('amount, flow_type, category, date, from_to').eq('organization_id', orgId).gte('date', sevenDaysAgo).order('date', { ascending: false }).limit(50),
    supabase.from('invoices').select('total, currency, status, customer_name, due_date').eq('organization_id', orgId).neq('status', 'paid').limit(20),
    supabase.from('expenses').select('amount, category, date').eq('organization_id', orgId).gte('date', sevenDaysAgo).order('date', { ascending: false }).limit(20),
  ])

  const org = orgRes.data
  const profile = profileRes.data
  const flows = flowsRes.data || []
  const invoices = invoicesRes.data || []
  const expenses = expensesRes.data || []

  const currency = org?.currency || 'JPY'
  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0)
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0)
  const balance = totalIn - totalOut
  const unpaidTotal = invoices.reduce((s, inv) => s + inv.total, 0)
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const today = new Date().toISOString().slice(0, 10)
  const overdueInvoices = invoices.filter((inv) => inv.due_date && inv.due_date < today)

  const ownerName = user.user_metadata?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Boss'

  const dataContext = `
Business: ${org?.name || 'Unknown'} (${org?.business_type || 'general'})
Currency: ${currency}
Owner: ${ownerName}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

LAST 7 DAYS CASH FLOW:
• Total In: ${currency} ${totalIn.toLocaleString()}
• Total Out: ${currency} ${totalOut.toLocaleString()}
• Net Balance: ${currency} ${balance.toLocaleString()}
• Transactions: ${flows.length}
${flows.slice(0, 5).map((f) => `  - ${f.flow_type} ${currency} ${f.amount.toLocaleString()} (${f.category}${f.from_to ? ' — ' + f.from_to : ''})`).join('\n')}

UNPAID INVOICES: ${invoices.length} total, ${currency} ${unpaidTotal.toLocaleString()}
${overdueInvoices.length > 0 ? `OVERDUE: ${overdueInvoices.length} invoices` : 'None overdue'}
${invoices.slice(0, 5).map((inv) => `  - ${inv.customer_name || 'Unknown'}: ${currency} ${inv.total.toLocaleString()} (${inv.status}${inv.due_date ? ', due ' + inv.due_date : ''})`).join('\n')}

RECENT EXPENSES (7 days): ${currency} ${expenseTotal.toLocaleString()}
${expenses.slice(0, 5).map((e) => `  - ${e.category}: ${currency} ${e.amount.toLocaleString()}`).join('\n')}
`.trim()

  try {
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate the morning briefing for ${ownerName}. Here is the current business data:\n\n${dataContext}`,
        },
      ],
    })

    const briefing = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ briefing, ownerName })
  } catch (err) {
    console.error('[BizPocket AI] Briefing generation failed:', err)
    return NextResponse.json(
      { briefing: null, error: 'AI generation failed' },
      { status: 200 }
    )
  }
}
