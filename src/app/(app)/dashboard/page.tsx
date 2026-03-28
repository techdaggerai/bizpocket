'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, getGreeting, getCurrentMonth, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import type { CashFlow, Invoice } from '@/types/database';

export default function DashboardPage() {
  const { profile, organization } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
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
  }, []);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const balance = totalIn - totalOut;
  const unpaidTotal = invoices.reduce((s, inv) => s + inv.total, 0);
  const recentFlows = flows.slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {profile.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400">{organization.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-400">{t('dashboard.cash_balance')}</p>
          <p className={`mt-1 text-xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-400">{t('dashboard.unpaid_invoices')}</p>
          <p className="mt-1 text-xl font-bold text-amber-400">
            {invoices.length > 0 ? `${invoices.length} (${formatCurrency(unpaidTotal, currency)})` : '0'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-400">{t('dashboard.monthly_income')}</p>
          <p className="mt-1 text-xl font-bold text-green-400">{formatCurrency(totalIn, currency)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-400">{t('dashboard.monthly_expenses')}</p>
          <p className="mt-1 text-xl font-bold text-red-400">{formatCurrency(totalOut, currency)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.quick_actions')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/invoices?new=1"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition-colors hover:border-amber-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-xs text-gray-300">{t('dashboard.new_invoice')}</span>
          </Link>
          <Link
            href="/cash-flow?new=1"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition-colors hover:border-amber-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-xs text-gray-300">{t('dashboard.new_expense')}</span>
          </Link>
          <Link
            href="/documents?scan=1"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition-colors hover:border-amber-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <span className="text-xs text-gray-300">{t('dashboard.scan_document')}</span>
          </Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.recent_transactions')}</h2>
          <Link href="/cash-flow" className="text-xs text-amber-400 hover:text-amber-300">View all</Link>
        </div>
        <div className="space-y-2">
          {recentFlows.length === 0 ? (
            <p className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-center text-sm text-gray-500">
              No transactions yet. Add your first cash flow entry.
            </p>
          ) : (
            recentFlows.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    f.flow_type === 'IN' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <svg className={`h-4 w-4 ${f.flow_type === 'IN' ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.flow_type === 'IN' ? 'M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75' : 'M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{f.category}</p>
                    <p className="text-xs text-gray-500">{formatDateShort(f.date)}{f.from_to ? ` · ${f.from_to}` : ''}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${f.flow_type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
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
