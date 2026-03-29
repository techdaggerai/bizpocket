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
  }, [month, organization.id, supabase]);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const expenses = flows.filter((f) => f.classify_as === 'expense');
  const expenseTotal = expenses.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)]">
          {isAccountant ? `${t('nav.accountant')} Portal` : t('nav.accountant')}
        </h1>
        <p className="text-xs text-[var(--text-4)]">
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
              month === m ? 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5] border border-[#4F46E5]/20' : 'border border-[#E5E5E5] text-[var(--text-4)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-[#E5E5E5] overflow-hidden">
        {(['overview', 'cashflow', 'invoices', 'expenses'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t ? 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5]' : 'text-[var(--text-4)] hover:text-[var(--text-2)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-card border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Total Income</p>
                  <p className="text-lg font-mono font-semibold text-[#16A34A]">{formatCurrency(totalIn, currency)}</p>
                </div>
                <div className="rounded-card border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Total Expenses</p>
                  <p className="text-lg font-mono font-semibold text-[#DC2626]">{formatCurrency(totalOut, currency)}</p>
                </div>
                <div className="rounded-card border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Net</p>
                  <p className={`text-lg font-mono font-semibold ${totalIn - totalOut >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {formatCurrency(totalIn - totalOut, currency)}
                  </p>
                </div>
                <div className="rounded-card border border-[#E5E5E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Transactions</p>
                  <p className="text-lg font-mono font-semibold text-[var(--text-1)]">{flows.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Tab */}
          {tab === 'cashflow' && (
            <div className="space-y-2">
              {flows.length === 0 ? (
                <p className="p-8 text-center text-sm text-[var(--text-4)]">No cash flow entries for {month}</p>
              ) : (
                flows.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm text-[var(--text-1)]">{f.category}</p>
                      <p className="text-xs text-[var(--text-4)]">{formatDate(f.date)} · {f.from_to}</p>
                    </div>
                    <span className={`text-sm font-mono font-semibold ${f.flow_type === 'IN' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
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
                <p className="p-8 text-center text-sm text-[var(--text-4)]">No invoices</p>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm text-[var(--text-1)]">{inv.customer_name}</p>
                      <p className="text-xs text-[var(--text-4)]">{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-[var(--text-1)]">{formatCurrency(inv.total, inv.currency)}</p>
                      <span className="text-[10px] text-[var(--text-3)] uppercase">{inv.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {tab === 'expenses' && (
            <div className="space-y-3">
              <div className="rounded-card border border-[#E5E5E5] bg-white p-4 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Total Expenses</p>
                <p className="text-xl font-mono font-semibold text-[#DC2626]">{formatCurrency(expenseTotal, currency)}</p>
              </div>
              {expenses.length === 0 ? (
                <p className="p-8 text-center text-sm text-[var(--text-4)]">No expenses for {month}</p>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm text-[var(--text-1)]">{exp.category}</p>
                      <p className="text-xs text-[var(--text-4)]">{formatDate(exp.date)}</p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-[#DC2626]">-{formatCurrency(exp.amount, currency)}</span>
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
