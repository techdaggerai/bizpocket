'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getCurrentMonth, getMonthRange, formatDate } from '@/lib/utils';
import NoteEditor from '@/components/NoteEditor';
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
  const [quickRecurring, setQuickRecurring] = useState(false);
  const [quickFrequency, setQuickFrequency] = useState('monthly');
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
      is_recurring: quickRecurring,
      recurring_frequency: quickRecurring ? quickFrequency : null,
    });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Expense added', 'success');
      setQuickAmount('');
      setQuickNotes('');
      setQuickRecurring(false);
      setShowQuickAdd(false);
      fetchExpenses();
    }
  }

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('expenses.title')}</h1>
          <p className="text-xs text-[var(--text-3)]">{t('expenses.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
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
            className={`flex-shrink-0 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              month === m ? 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/20' : 'border border-[var(--border)] text-[var(--text-3)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-center">
        <p className="text-xs text-[var(--text-4)] uppercase tracking-wider">{t('expenses.total')}</p>
        <p className="font-mono text-2xl font-medium text-[var(--red)]">{formatCurrency(total, currency)}</p>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} className="space-y-3 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <input
            type="number"
            inputMode="numeric"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            placeholder={t('expenses.amount')}
            className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-3 font-mono text-lg text-[var(--text-1)] placeholder-[var(--text-4)] text-center focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
            autoFocus
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className={inputClass}
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder={t('expenses.notes')}
            className={inputClass}
          />
          {/* Recurring Toggle */}
          <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setQuickRecurring(!quickRecurring)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  quickRecurring ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                }`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  quickRecurring ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-[var(--text-2)]">Make this recurring</span>
            </label>
            {quickRecurring && (
              <div className="space-y-1">
                <select
                  value={quickFrequency}
                  onChange={(e) => setQuickFrequency(e.target.value)}
                  className={inputClass}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <p className="text-xs text-[var(--text-4)]">This expense will auto-log every {quickFrequency}</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : t('expenses.add_expense')}
          </button>
        </form>
      )}

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">By Category</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-xs text-[var(--text-3)]">{cat}</p>
                <p className="font-mono text-sm font-medium text-[var(--text-1)]">{formatCurrency(amt, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">{t('expenses.no_expenses')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-[var(--text-1)]">{exp.category}</p>
                  <p className="text-xs text-[var(--text-4)]">{formatDate(exp.date)}{exp.description ? ` · ${exp.description}` : ''}</p>
                </div>
                <span className="font-mono text-base font-medium text-[var(--red)]">-{formatCurrency(exp.amount, currency)}</span>
              </div>
              <div className="mt-1.5">
                <NoteEditor
                  note={(exp as any).notes || null}
                  onSave={async (note) => {
                    await supabase.from('cash_flows').update({ notes: note }).eq('id', exp.id);
                    fetchExpenses();
                  }}
                  onDelete={async () => {
                    await supabase.from('cash_flows').update({ notes: null }).eq('id', exp.id);
                    fetchExpenses();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
