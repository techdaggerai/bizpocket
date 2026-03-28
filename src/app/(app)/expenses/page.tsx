'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getCurrentMonth, getMonthRange, formatDate } from '@/lib/utils';
import type { CashFlow } from '@/types/database';

const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Utility', 'Fuel', 'Food', 'Repair Cost', 'Parts',
  'Shipping', 'Tax', 'Insurance', 'Office Expense', 'Other',
];

export default function ExpensesPage() {
  const { organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const months = getMonthRange(12);
  const currency = organization.currency || 'JPY';

  const [month, setMonth] = useState(getCurrentMonth());
  const [expenses, setExpenses] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [quickNotes, setQuickNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_flows')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('classify_as', 'expense')
      .gte('date', month + '-01')
      .lte('date', month + '-31')
      .order('date', { ascending: false });
    if (error) toast(error.message, 'error');
    else setExpenses(data || []);
    setLoading(false);
  }, [month, organization.id, supabase, toast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const amount = parseFloat(quickAmount) || 0;
    const { error } = await supabase.from('cash_flows').insert({
      organization_id: organization.id,
      date: new Date().toISOString().slice(0, 10),
      flow_type: 'OUT',
      amount,
      currency,
      category: quickCategory,
      from_to: '',
      description: quickNotes || null,
      status: 'COMPLETED',
      classify_as: 'expense',
    });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Expense added', 'success');
      setQuickAmount('');
      setQuickNotes('');
      setShowQuickAdd(false);
      fetchExpenses();
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    Rent: 'bg-purple-500/10 text-purple-400',
    Salary: 'bg-blue-500/10 text-blue-400',
    Utility: 'bg-yellow-500/10 text-yellow-400',
    Fuel: 'bg-orange-500/10 text-orange-400',
    Food: 'bg-green-500/10 text-green-400',
    'Repair Cost': 'bg-red-500/10 text-red-400',
    Parts: 'bg-cyan-500/10 text-cyan-400',
    Tax: 'bg-pink-500/10 text-pink-400',
    Insurance: 'bg-indigo-500/10 text-indigo-400',
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('expenses.title')}</h1>
          <p className="text-xs text-gray-400">{t('expenses.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
        >
          {showQuickAdd ? t('common.cancel') : t('expenses.add_expense')}
        </button>
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

      {/* Total */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
        <p className="text-xs text-gray-500 uppercase">{t('expenses.total')}</p>
        <p className="text-2xl font-bold text-red-400">{formatCurrency(total, currency)}</p>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <input
            type="number"
            inputMode="numeric"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            placeholder={t('expenses.amount')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-lg text-white placeholder-gray-500 text-center"
            required
            autoFocus
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200"
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder={t('expenses.notes')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-gray-950 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </form>
      )}

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase">By Category</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className={`rounded-xl border border-gray-800 p-3 ${CATEGORY_COLORS[cat] || 'bg-gray-500/10 text-gray-400'}`}>
                <p className="text-xs opacity-70">{cat}</p>
                <p className="text-sm font-bold">{formatCurrency(amt, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
          {t('expenses.no_expenses')}
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{exp.category}</p>
                <p className="text-xs text-gray-500">{formatDate(exp.date)}{exp.description ? ` · ${exp.description}` : ''}</p>
              </div>
              <span className="text-sm font-bold text-red-400">-{formatCurrency(exp.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
