'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getCurrentMonth, getMonthRange, formatDate } from '@/lib/utils';
import type { CashFlow, FlowType, ClassifyAs } from '@/types/database';

const CATEGORIES = [
  'Auction Purchase', 'Repair Cost', 'Parts', 'Sale', 'Rent', 'Fuel',
  'Food', 'Salary', 'Utility', 'Shipping', 'Tax', 'Insurance', 'Other',
];

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  flow_type: 'IN' as FlowType,
  category: CATEGORIES[0],
  from_to: '',
  description: '',
  amount: '',
  status: 'COMPLETED',
  classify_as: 'cash_flow_only' as ClassifyAs,
  is_recurring: false,
  recurring_frequency: 'monthly' as string,
  recurring_end_date: '',
  notes: '',
};

export default function CashFlowPage() {
  const { organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const months = getMonthRange(12);
  const currency = organization.currency || 'JPY';

  const [month, setMonth] = useState(getCurrentMonth());
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_flows')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('date', month + '-01')
      .lte('date', month + '-31')
      .order('date', { ascending: true });
    if (error) toast(error.message, 'error');
    else setFlows(data || []);
    setLoading(false);
  }, [month, organization.id, supabase, toast]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new')) {
      setShowForm(true);
    }
  }, []);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const net = totalIn - totalOut;

  let runningBalance = 0;
  const flowsWithBalance = flows.map((f) => {
    runningBalance += f.flow_type === 'IN' ? f.amount : -f.amount;
    return { ...f, balance: runningBalance };
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const amount = parseFloat(form.amount) || 0;
    const payload = {
      organization_id: organization.id,
      date: form.date,
      flow_type: form.flow_type,
      amount,
      currency,
      category: form.category,
      from_to: form.from_to,
      description: form.description || null,
      status: form.status,
      classify_as: form.classify_as,
      is_recurring: form.is_recurring,
      recurring_frequency: form.is_recurring ? form.recurring_frequency : null,
      recurring_end_date: form.is_recurring && form.recurring_end_date ? form.recurring_end_date : null,
      notes: form.notes || null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('cash_flows').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('cash_flows').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editId ? 'Entry updated' : 'Entry added', 'success');
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      fetchFlows();
    }
  }

  function startEdit(f: CashFlow) {
    setForm({
      date: f.date,
      flow_type: f.flow_type,
      category: f.category,
      from_to: f.from_to,
      description: f.description || '',
      amount: String(f.amount),
      status: f.status,
      classify_as: f.classify_as,
      is_recurring: f.is_recurring || false,
      recurring_frequency: f.recurring_frequency || 'monthly',
      recurring_end_date: f.recurring_end_date || '',
      notes: f.notes || '',
    });
    setEditId(f.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cash_flows').delete().eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast('Entry deleted', 'success'); fetchFlows(); }
  }

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('cash_flow.title')}</h1>
          <p className="text-xs text-[var(--text-3)]">{t('cash_flow.subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
        >
          {showForm ? t('cash_flow.cancel') : t('cash_flow.add_entry')}
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`flex-shrink-0 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              month === m ? 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/20' : 'border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-center">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">{t('cash_flow.total_in')}</p>
          <p className="font-mono text-sm font-medium text-[var(--green)]">{formatCurrency(totalIn, currency)}</p>
        </div>
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-center">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">{t('cash_flow.total_out')}</p>
          <p className="font-mono text-sm font-medium text-[var(--red)]">{formatCurrency(totalOut, currency)}</p>
        </div>
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-center">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">{t('cash_flow.net')}</p>
          <p className={`font-mono text-sm font-medium ${net >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{formatCurrency(net, currency)}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="text-base font-medium text-[var(--text-1)]">{editId ? 'Edit Entry' : 'New Entry'}</h3>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
            required
          />

          <div className="flex overflow-hidden rounded-btn border border-[var(--border-strong)]">
            <button
              type="button"
              onClick={() => setForm({ ...form, flow_type: 'IN' })}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.flow_type === 'IN' ? 'bg-[var(--green)] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'
              }`}
            >
              {t('cash_flow.type_in')}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, flow_type: 'OUT' })}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.flow_type === 'OUT' ? 'bg-[var(--red)] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'
              }`}
            >
              {t('cash_flow.type_out')}
            </button>
          </div>

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            placeholder={t('cash_flow.from_to')}
            value={form.from_to}
            onChange={(e) => setForm({ ...form, from_to: e.target.value })}
            className={inputClass}
            required
          />

          <input
            placeholder={t('cash_flow.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder={t('cash_flow.amount')}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputClass}
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <select
              value={form.classify_as}
              onChange={(e) => setForm({ ...form, classify_as: e.target.value as ClassifyAs })}
              className={inputClass}
            >
              <option value="cash_flow_only">{t('cash_flow.cash_flow_only')}</option>
              <option value="expense">{t('cash_flow.expense')}</option>
              <option value="investment">{t('cash_flow.investment')}</option>
            </select>
          </div>

          {/* Notes */}
          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />

          {/* Recurring Toggle */}
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  form.is_recurring ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                }`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.is_recurring ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-[var(--text-2)]">Make this recurring</span>
            </label>
            {form.is_recurring && (
              <div className="space-y-2">
                <select
                  value={form.recurring_frequency}
                  onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                  className={inputClass}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.recurring_end_date}
                  onChange={(e) => setForm({ ...form, recurring_end_date: e.target.value })}
                  placeholder="End date (optional)"
                  className={inputClass}
                />
                <p className="text-xs text-[var(--text-4)]">
                  This will auto-log every {form.recurring_frequency}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? t('cash_flow.saving') : t('cash_flow.save')}
          </button>
        </form>
      )}

      {/* Flow List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : flowsWithBalance.length === 0 ? (
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">{t('cash_flow.no_entries')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flowsWithBalance.map((f) => (
            <div key={f.id} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    f.flow_type === 'IN' ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--red-bg)] text-[var(--red)]'
                  }`}>
                    {f.flow_type === 'IN' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-base font-medium text-[var(--text-1)]">{f.category}</p>
                    <p className="text-xs text-[var(--text-4)]">{formatDate(f.date)} · {f.from_to}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-base font-medium ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}
                  </p>
                  <p className={`font-mono text-[10px] ${f.balance >= 0 ? 'text-[var(--text-4)]' : 'text-[var(--red)]'}`}>
                    bal: {formatCurrency(f.balance, currency)}
                  </p>
                </div>
              </div>
              {f.description && <p className="mt-1 text-xs text-[var(--text-4)] pl-11">{f.description}</p>}
              {f.notes && <p className="mt-0.5 text-xs text-[var(--text-3)] pl-11 italic">{f.notes}</p>}
              <div className="mt-2 flex items-center gap-2 pl-11">
                <span className={`rounded-btn px-1.5 py-0.5 text-[10px] font-medium ${
                  f.status === 'COMPLETED' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                  f.status === 'PENDING' ? 'bg-[var(--accent-light)] text-[var(--accent)]' :
                  'bg-[var(--bg-3)] text-[var(--text-4)]'
                }`}>{f.status}</span>
                {f.is_recurring && (
                  <span className="rounded-btn bg-[rgba(124,58,237,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#7C3AED]">
                    {f.recurring_frequency || 'recurring'}
                  </span>
                )}
                {f.classify_as !== 'cash_flow_only' && (
                  <span className="rounded-btn bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                    {f.classify_as}
                  </span>
                )}
                <div className="ml-auto flex gap-3">
                  <button onClick={() => startEdit(f)} className="text-[10px] text-[var(--text-4)] hover:text-[var(--accent)]">Edit</button>
                  <button onClick={() => handleDelete(f.id)} className="text-[10px] text-[var(--text-4)] hover:text-[var(--red)]">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
