import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { organizationId: string; month: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { organizationId, month } = body;

  // Fetch all data for the month
  const [orgRes, flowsRes, expensesRes, invoicesRes, docsRes] = await Promise.all([
    supabase.from('organizations').select('name, business_type, currency').eq('id', organizationId).single(),
    supabase.from('cash_flows').select('amount, flow_type, category, description, date')
      .eq('organization_id', organizationId)
      .gte('date', month + '-01').lte('date', month + '-31')
      .order('date', { ascending: true }),
    supabase.from('cash_flows').select('amount, category, description, date')
      .eq('organization_id', organizationId)
      .eq('classify_as', 'expense')
      .gte('date', month + '-01').lte('date', month + '-31')
      .order('category', { ascending: true }),
    supabase.from('invoices').select('invoice_number, customer_name, total, status, currency')
      .eq('organization_id', organizationId)
      .gte('created_at', month + '-01T00:00:00Z')
      .lte('created_at', month + '-31T23:59:59Z'),
    supabase.from('documents').select('id, title, category')
      .eq('organization_id', organizationId)
      .gte('date', month + '-01').lte('date', month + '-31'),
  ]);

  const org = orgRes.data;
  const flows = flowsRes.data || [];
  const expenses = expensesRes.data || [];
  const invoices = invoicesRes.data || [];
  const docs = docsRes.data || [];
  const currency = org?.currency || 'JPY';

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Group expenses by category
  const byCategory = expenses.reduce<Record<string, { total: number; items: string[] }>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { total: 0, items: [] };
    acc[e.category].total += e.amount;
    acc[e.category].items.push(`${e.description || e.category} (${currency} ${e.amount.toLocaleString()})`);
    return acc;
  }, {});

  const dataContext = `
Business: ${org?.name || 'Unknown'} (${org?.business_type || 'general'})
Currency: ${currency}
Month: ${month}

CASH FLOW SUMMARY:
Total In: ${currency} ${totalIn.toLocaleString()}
Total Out: ${currency} ${totalOut.toLocaleString()}
Net: ${currency} ${(totalIn - totalOut).toLocaleString()}

EXPENSES BY CATEGORY (${currency} ${totalExpenses.toLocaleString()} total):
${Object.entries(byCategory).map(([cat, data]) => `  ${cat}: ${currency} ${data.total.toLocaleString()}\n    ${data.items.join(', ')}`).join('\n')}

INVOICES THIS MONTH: ${invoices.length}
${invoices.map((i) => `  ${i.invoice_number}: ${i.customer_name} - ${i.currency} ${i.total.toLocaleString()} (${i.status})`).join('\n')}

DOCUMENTS UPLOADED: ${docs.length}
`.trim();

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a Japanese accountant report generator. Generate a professional monthly business report IN JAPANESE for the business owner's tax accountant (税理士).

Format: Clean, organized, with category breakdowns. Use proper Japanese accounting terminology. Include totals and subtotals. End with a note about attached receipts.

The report should be ready to send directly to a Japanese accountant — no English.`,
      messages: [
        {
          role: 'user',
          content: `Generate the accountant report for this month. Here is the data:\n\n${dataContext}`,
        },
      ],
    });

    const report = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ report });
  } catch (err) {
    console.error('[BizPocket AI] Accountant report failed:', err);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
