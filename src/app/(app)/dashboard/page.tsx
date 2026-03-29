'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, getGreeting, getCurrentMonth, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import type { CashFlow, Invoice } from '@/types/database';

export default function DashboardPage() {
  const { user, profile, organization } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const fullName = user.user_metadata?.full_name || profile.name || '';
  const firstName = fullName.split(' ')[0] || '';
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const month = getCurrentMonth();
  const currency = organization.currency || 'JPY';

  useEffect(() => {
    async function load() {
      const [flowRes, invRes] = await Promise.all([
        supabase
          .from('cash_flows')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('date', month + '-01')
          .lte('date', month + '-31')
          .order('date', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .neq('status', 'paid'),
      ]);
      setFlows(flowRes.data || []);
      setInvoices(invRes.data || []);
      setLoading(false);
    }
    load();
  }, [supabase, organization.id, month]);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const balance = totalIn - totalOut;
  const unpaidTotal = invoices.reduce((s, inv) => s + inv.total, 0);
  const recentFlows = flows.slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-1)]">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-[var(--text-3)]">{organization.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.cash_balance')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.unpaid_invoices')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">
            {invoices.length > 0 ? `${invoices.length} (${formatCurrency(unpaidTotal, currency)})` : '0'}
          </p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_income')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#16A34A]">{formatCurrency(totalIn, currency)}</p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_expenses')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#DC2626]">{formatCurrency(totalOut, currency)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{t('dashboard.quick_actions')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/invoices?new=1"
            className="flex flex-col items-center gap-3 rounded-[12px] bg-[rgba(79,70,229,0.08)] p-5 text-center transition-all hover:bg-[rgba(79,70,229,0.12)]"
          >
            <svg className="h-6 w-6 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-xs font-medium text-[#4F46E5]">{t('dashboard.new_invoice')}</span>
          </Link>
          <Link
            href="/cash-flow?new=1"
            className="flex flex-col items-center gap-3 rounded-[12px] bg-[rgba(22,163,74,0.08)] p-5 text-center transition-all hover:bg-[rgba(22,163,74,0.12)]"
          >
            <svg className="h-6 w-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-xs font-medium text-[#16A34A]">{t('dashboard.new_expense')}</span>
          </Link>
          <Link
            href="/documents?scan=1"
            className="flex flex-col items-center gap-3 rounded-[12px] bg-[rgba(79,70,229,0.08)] p-5 text-center transition-all hover:bg-[rgba(79,70,229,0.12)]"
          >
            <svg className="h-6 w-6 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            <span className="text-xs font-medium text-[#4F46E5]">{t('dashboard.scan_document')}</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{t('dashboard.recent_transactions')}</h2>
          <Link href="/cash-flow" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">View all</Link>
        </div>
        <div className="space-y-2">
          {recentFlows.length === 0 ? (
            <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
              <p className="text-sm text-[var(--text-3)]">No transactions yet. Add your first cash flow entry.</p>
            </div>
          ) : (
            recentFlows.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    f.flow_type === 'IN' ? 'bg-[var(--green-bg)]' : 'bg-[var(--red-bg)]'
                  }`}>
                    <svg className={`h-4 w-4 ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.flow_type === 'IN' ? 'M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75' : 'M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-[var(--text-1)]">{f.category}</p>
                    <p className="text-xs text-[var(--text-4)]">{formatDateShort(f.date)}{f.from_to ? ` · ${f.from_to}` : ''}</p>
                  </div>
                </div>
                <span className={`font-mono text-base font-medium ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
