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

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  flow_type: 'IN' as FlowType,
  category: CATEGORIES[0],
  from_to: '',
  description: '',
  amount: '',
  status: 'COMPLETED',
  classify_as: 'cash_flow_only' as ClassifyAs,
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
  }, [month, organization.id]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  // Open form from URL param
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
    });
    setEditId(f.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cash_flows').delete().eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast('Entry deleted', 'success'); fetchFlows(); }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('cash_flow.title')}</h1>
          <p className="text-xs text-gray-400">{t('cash_flow.subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
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
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              month === m ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{t('cash_flow.total_in')}</p>
          <p className="text-sm font-bold text-green-400">{formatCurrency(totalIn, currency)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{t('cash_flow.total_out')}</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(totalOut, currency)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{t('cash_flow.net')}</p>
          <p className={`text-sm font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(net, currency)}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-white">{editId ? 'Edit Entry' : 'New Entry'}</h3>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200"
            required
          />

          <div className="flex overflow-hidden rounded-lg border border-gray-700">
            <button
              type="button"
              onClick={() => setForm({ ...form, flow_type: 'IN' })}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.flow_type === 'IN' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {t('cash_flow.type_in')}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, flow_type: 'OUT' })}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.flow_type === 'OUT' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {t('cash_flow.type_out')}
            </button>
          </div>

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            placeholder={t('cash_flow.from_to')}
            value={form.from_to}
            onChange={(e) => setForm({ ...form, from_to: e.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500"
            required
          />

          <input
            placeholder={t('cash_flow.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500"
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder={t('cash_flow.amount')}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200"
            >
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <select
              value={form.classify_as}
              onChange={(e) => setForm({ ...form, classify_as: e.target.value as ClassifyAs })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200"
            >
              <option value="cash_flow_only">{t('cash_flow.cash_flow_only')}</option>
              <option value="expense">{t('cash_flow.expense')}</option>
              <option value="investment">{t('cash_flow.investment')}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {saving ? t('cash_flow.saving') : t('cash_flow.save')}
          </button>
        </form>
      )}

      {/* Flow List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : flowsWithBalance.length === 0 ? (
        <p className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
          {t('cash_flow.no_entries')}
        </p>
      ) : (
        <div className="space-y-2">
          {flowsWithBalance.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    f.flow_type === 'IN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {f.flow_type === 'IN' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{f.category}</p>
                    <p className="text-xs text-gray-500">{formatDate(f.date)} · {f.from_to}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${f.flow_type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                    {f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}
                  </p>
                  <p className={`text-[10px] ${f.balance >= 0 ? 'text-gray-400' : 'text-red-400'}`}>
                    bal: {formatCurrency(f.balance, currency)}
                  </p>
                </div>
              </div>
              {f.description && <p className="mt-1 text-xs text-gray-500 pl-11">{f.description}</p>}
              <div className="mt-2 flex items-center gap-2 pl-11">
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                  f.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                  f.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>{f.status}</span>
                {f.classify_as !== 'cash_flow_only' && (
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                    {f.classify_as}
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => startEdit(f)} className="text-[10px] text-gray-500 hover:text-amber-400">Edit</button>
                  <button onClick={() => handleDelete(f.id)} className="text-[10px] text-gray-500 hover:text-red-400">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
