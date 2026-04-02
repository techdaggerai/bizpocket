import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

  let body: { organizationId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const orgId = body.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const notifications: Array<{
    organization_id: string;
    type: string;
    title: string;
    body: string;
    action_url: string | null;
  }> = [];

  // Check overdue invoices (1, 3, 7 days)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, total, currency, status, sent_at, created_at')
    .eq('organization_id', orgId)
    .eq('status', 'sent');

  if (invoices) {
    for (const inv of invoices) {
      const sentDate = inv.sent_at || inv.created_at;
      const daysSinceSent = Math.floor(
        (Date.now() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceSent >= 7) {
        notifications.push({
          organization_id: orgId,
          type: 'invoice_overdue',
          title: `Invoice ${inv.invoice_number} overdue 7+ days`,
          body: `${inv.customer_name} owes ${inv.currency} ${inv.total.toLocaleString()}. Sent ${daysSinceSent} days ago.`,
          action_url: `/invoices/${inv.id}`,
        });
      } else if (daysSinceSent >= 3) {
        notifications.push({
          organization_id: orgId,
          type: 'invoice_overdue',
          title: `Invoice ${inv.invoice_number} overdue 3+ days`,
          body: `${inv.customer_name} — follow up on payment of ${inv.currency} ${inv.total.toLocaleString()}.`,
          action_url: `/invoices/${inv.id}`,
        });
      } else if (daysSinceSent >= 1) {
        notifications.push({
          organization_id: orgId,
          type: 'invoice_overdue',
          title: `Invoice ${inv.invoice_number} pending 1+ day`,
          body: `Sent to ${inv.customer_name} — ${inv.currency} ${inv.total.toLocaleString()}.`,
          action_url: `/invoices/${inv.id}`,
        });
      }
    }
  }

  // Check low cash balance
  const currentMonth = today.slice(0, 7);
  const { data: flows } = await supabase
    .from('cash_flows')
    .select('amount, flow_type')
    .eq('organization_id', orgId)
    .gte('date', currentMonth + '-01')
    .lt('date', (() => { const d = new Date(Number(currentMonth.split('-')[0]), Number(currentMonth.split('-')[1]), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })());

  if (flows) {
    const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
    const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
    const balance = totalIn - totalOut;
    if (balance < 0) {
      notifications.push({
        organization_id: orgId,
        type: 'low_balance',
        title: 'Low cash balance warning',
        body: `Your monthly cash balance is negative. Current: ${balance.toLocaleString()}. Review expenses.`,
        action_url: '/cash-flow',
      });
    }
  }

  // Check upcoming planner events (1 day before)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: events } = await supabase
    .from('planner_events')
    .select('id, title, event_type, amount, currency, event_date')
    .eq('organization_id', orgId)
    .eq('event_date', tomorrow)
    .eq('status', 'pending');

  if (events && events.length > 0) {
    for (const evt of events) {
      notifications.push({
        organization_id: orgId,
        type: 'planner_reminder',
        title: `Tomorrow: ${evt.title}`,
        body: evt.amount ? `${evt.event_type} — ${evt.currency || 'JPY'} ${evt.amount.toLocaleString()}` : evt.event_type,
        action_url: '/planner',
      });
    }
  }

  // Deduplicate: don't create notifications that already exist today
  if (notifications.length > 0) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('title')
      .eq('organization_id', orgId)
      .gte('created_at', today + 'T00:00:00Z');

    const existingTitles = new Set((existing || []).map((n) => n.title));
    const newNotifications = notifications.filter((n) => !existingTitles.has(n.title));

    if (newNotifications.length > 0) {
      await supabase.from('notifications').insert(newNotifications);
    }

    return NextResponse.json({ created: newNotifications.length, total: notifications.length });
  }

  return NextResponse.json({ created: 0, total: 0 });
}
