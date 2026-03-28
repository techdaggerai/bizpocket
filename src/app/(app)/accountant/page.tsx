'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, formatDate, getMonthRange } from '@/lib/utils';
import type { CashFlow, Invoice } from '@/types/database';

export default function AccountantPage() {
  const { organization, profile } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const months = getMonthRange(12);
  const currency = organization.currency || 'JPY';
  const isAccountant = profile.role === 'accountant';

  const [month, setMonth] = useState(months[0]);
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'cashflow' | 'invoices' | 'expenses'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [flowRes, invRes] = await Promise.all([
        supabase
          .from('cash_flows')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('date', month + '-01')
          .lte('date', month + '-31')
          .order('date', { ascending: true }),
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false }),
      ]);
      setFlows(flowRes.data || []);
      setInvoices(invRes.data || []);
      setLoading(false);
    }
    load();
  }, [month, organization.id]);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const expenses = flows.filter((f) => f.classify_as === 'expense');
  const expenseTotal = expenses.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-white">
          {isAccountant ? `${t('nav.accountant')} Portal` : t('nav.accountant')}
        </h1>
        <p className="text-xs text-gray-400">
          {isAccountant ? 'Read-only access to all financials' : 'Monthly financial overview for your accountant'}
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              month === m ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'border border-gray-800 text-gray-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-800 overflow-hidden">
        {(['overview', 'cashflow', 'invoices', 'expenses'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <p className="text-xs text-gray-500">Total Income</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(totalIn, currency)}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <p className="text-xs text-gray-500">Total Expenses</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(totalOut, currency)}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <p className="text-xs text-gray-500">Net</p>
                  <p className={`text-lg font-bold ${totalIn - totalOut >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalIn - totalOut, currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-lg font-bold text-white">{flows.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Tab */}
          {tab === 'cashflow' && (
            <div className="space-y-2">
              {flows.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No cash flow entries for {month}</p>
              ) : (
                flows.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{f.category}</p>
                      <p className="text-xs text-gray-500">{formatDate(f.date)} · {f.from_to}</p>
                    </div>
                    <span className={`text-sm font-bold ${f.flow_type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                      {f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {tab === 'invoices' && (
            <div className="space-y-2">
              {invoices.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No invoices</p>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{inv.customer_name}</p>
                      <p className="text-xs text-gray-500">{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatCurrency(inv.total, inv.currency)}</p>
                      <span className="text-[10px] text-gray-400 uppercase">{inv.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {tab === 'expenses' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(expenseTotal, currency)}</p>
              </div>
              {expenses.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No expenses for {month}</p>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{exp.category}</p>
                      <p className="text-xs text-gray-500">{formatDate(exp.date)}</p>
                    </div>
                    <span className="text-sm font-bold text-red-400">-{formatCurrency(exp.amount, currency)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
