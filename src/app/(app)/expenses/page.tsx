'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getCurrentMonth, formatDate } from '@/lib/utils';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import type { CashFlow, PlannedExpense, PlannedIncome } from '@/types/database';

const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Utility', 'Fuel', 'Food', 'Repair Cost', 'Parts',
  'Shipping', 'Tax', 'Insurance', 'Office Expense', 'Loan Payment', 'Other',
];

const INCOME_CATEGORIES = [
  'Customer Payment', 'Sale Revenue', 'Settlement', 'Loan Return',
  'Refund', 'Export Revenue', 'Other',
];

function getMonthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

function getForwardMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

export default function ExpensePlannerPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';
  const allMonths = getForwardMonths(4);

  const [openMonth, setOpenMonth] = useState(getCurrentMonth());
  const [tab, setTab] = useState<'actual' | 'planner'>('actual');
  const [expenses, setExpenses] = useState<CashFlow[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [plannedIncome, setPlannedIncome] = useState<PlannedIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    notes: '',
    is_recurring: false,
  });

  const [incomeForm, setIncomeForm] = useState({
    category: INCOME_CATEGORIES[0],
    description: '',
    amount: '',
    expected_date: '',
    notes: '',
  });

  const fetchData = useCallback(async (m: string) => {
    if (!m) return;
    setLoading(true);

    const [expRes, peRes, piRes] = await Promise.all([
      supabase
        .from('cash_flows')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('classify_as', 'expense')
        .gte('date', m + '-01')
        .lt('date', (() => { const d = new Date(Number(m.split('-')[0]), Number(m.split('-')[1]), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })())
        .order('date', { ascending: false }),
      supabase
        .from('planned_expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month', m)
        .order('is_completed')
        .order('created_at'),
      supabase
        .from('planned_income')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month', m)
        .order('is_completed')
        .order('created_at'),
    ]);

    setExpenses(expRes.data || []);
    setPlannedExpenses(peRes.data || []);
    setPlannedIncome(piRes.data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => {
    fetchData(openMonth);
  }, [openMonth, fetchData]);

  // Computed values
  const actualTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const plannedTotal = plannedExpenses.reduce((s, e) => s + e.planned_amount, 0);
  const coveredExpenses = plannedExpenses
    .filter((e) => e.is_completed)
    .reduce((s, e) => s + e.planned_amount, 0);
  const remainingExpenses = plannedTotal - coveredExpenses;
  const incomeTotal = plannedIncome.reduce((s, i) => s + i.planned_amount, 0);
  const receivedIncome = plannedIncome
    .filter((i) => i.is_completed)
    .reduce((s, i) => s + i.planned_amount, 0);
  const pendingIncome = incomeTotal - receivedIncome;
  const variance = plannedTotal - actualTotal;
  const netPosition = pendingIncome - remainingExpenses;

  const byCategory = expenses.reduce<Record<string, CashFlow[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  // CRUD helpers
  async function togglePE(id: string, current: boolean) {
    await supabase.from('planned_expenses').update({ is_completed: !current }).eq('id', id);
    fetchData(openMonth);
  }

  async function togglePI(id: string, current: boolean) {
    await supabase.from('planned_income').update({ is_completed: !current }).eq('id', id);
    fetchData(openMonth);
  }

  async function deletePE(id: string) {
    await supabase.from('planned_expenses').delete().eq('id', id);
    fetchData(openMonth);
    toast('Removed', 'success');
  }

  async function deletePI(id: string) {
    await supabase.from('planned_income').delete().eq('id', id);
    fetchData(openMonth);
    toast('Removed', 'success');
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    setSaving(true);

    const { error } = await supabase.from('planned_expenses').insert({
      organization_id: organization.id,
      month: openMonth,
      category: expenseForm.category,
      description: expenseForm.description,
      planned_amount: parseInt(expenseForm.amount),
      is_recurring: expenseForm.is_recurring,
      notes: expenseForm.notes || null,
      created_by: user.id,
    });

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Added', 'success');
    setExpenseForm({ category: EXPENSE_CATEGORIES[0], description: '', amount: '', notes: '', is_recurring: false });
    setShowExpenseForm(false);
    fetchData(openMonth);
  }

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!incomeForm.description || !incomeForm.amount) return;
    setSaving(true);

    const { error } = await supabase.from('planned_income').insert({
      organization_id: organization.id,
      month: openMonth,
      category: incomeForm.category,
      description: incomeForm.description,
      planned_amount: parseInt(incomeForm.amount),
      expected_date: incomeForm.expected_date || null,
      notes: incomeForm.notes || null,
      created_by: user.id,
    });

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Added', 'success');
    setIncomeForm({ category: INCOME_CATEGORIES[0], description: '', amount: '', expected_date: '', notes: '' });
    setShowIncomeForm(false);
    fetchData(openMonth);
  }

  const inputClass =
    'w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" backPath="/dashboard" />
      {/* Header */}
      <div>
        <p className="text-xs text-[var(--text-3)]">Plan it. Track it. Compare it.</p>
      </div>

      {/* Month accordion */}
      {allMonths.map((m) => {
        const isOpen = m === openMonth;

        return (
          <div key={m}>
            <button
              onClick={() => setOpenMonth(isOpen ? '' : m)}
              className={`w-full rounded-t-xl border px-4 py-3 text-left transition-colors ${
                isOpen
                  ? 'border-[var(--accent)]/20 bg-gradient-to-r from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)]'
                  : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--bg-2)]'
              } ${!isOpen ? 'rounded-b-xl' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className={`h-4 w-4 text-[var(--text-3)] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  <span className="text-sm font-bold text-[var(--text-1)]">{getMonthLabel(m)}</span>
                </div>
                {m === getCurrentMonth() && (
                  <span className="rounded-btn bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    CURRENT
                  </span>
                )}
              </div>

              {isOpen && !loading && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-[var(--text-4)] uppercase">Planned</p>
                    <p className="font-mono text-sm font-semibold text-[var(--text-1)]">
                      {formatCurrency(plannedTotal, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-4)] uppercase">Actual</p>
                    <p className="font-mono text-sm font-semibold text-[var(--text-1)]">
                      {formatCurrency(actualTotal, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-4)] uppercase">Variance</p>
                    <p className={`font-mono text-sm font-semibold ${variance >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {formatCurrency(Math.abs(variance), currency)}
                    </p>
                  </div>
                </div>
              )}
            </button>

            {isOpen && (
              <div className="rounded-b-xl border border-t-0 border-[var(--card-border)] bg-[var(--card-bg)]">
                {/* Tab bar */}
                <div className="flex border-b border-[var(--border)]">
                  <button
                    onClick={() => setTab('actual')}
                    className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                      tab === 'actual'
                        ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                        : 'text-[var(--text-3)]'
                    }`}
                  >
                    Actual
                  </button>
                  <button
                    onClick={() => setTab('planner')}
                    className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                      tab === 'planner'
                        ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                        : 'text-[var(--text-3)]'
                    }`}
                  >
                    Planner
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  </div>
                ) : tab === 'actual' ? (
                  /* ── ACTUAL TAB ── */
                  <div className="p-4 space-y-4">
                    {Object.keys(byCategory).length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-[var(--text-3)]">No expenses this month.</p>
                        <Link
                          href="/cash-flow?new=1"
                          className="mt-2 inline-block text-sm font-medium text-[var(--accent)]"
                        >
                          Log a cash out &rarr;
                        </Link>
                      </div>
                    ) : (
                      <>
                        {Object.entries(byCategory)
                          .sort((a, b) => {
                            const aTotal = a[1].reduce((s, e) => s + e.amount, 0);
                            const bTotal = b[1].reduce((s, e) => s + e.amount, 0);
                            return bTotal - aTotal;
                          })
                          .map(([cat, items]) => {
                            const catTotal = items.reduce((s, e) => s + e.amount, 0);
                            return (
                              <div key={cat}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
                                    {cat}
                                  </span>
                                  <span className="font-mono text-sm font-semibold text-[var(--text-1)]">
                                    {formatCurrency(catTotal, currency)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {items.map((e) => (
                                    <div
                                      key={e.id}
                                      className="flex items-center justify-between rounded-lg bg-[var(--bg-2)] px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-sm text-[var(--text-1)]">
                                          {e.description || e.category}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-4)]">
                                          {formatDate(e.date)}
                                          {e.from_to ? ` \u00B7 ${e.from_to}` : ''}
                                        </p>
                                      </div>
                                      <span className="font-mono text-sm font-medium text-[var(--red)]">
                                        {formatCurrency(e.amount, currency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                          <span className="text-sm font-bold text-[var(--text-1)]">Total Actual</span>
                          <span className="font-mono text-lg font-bold text-[var(--red)]">
                            {formatCurrency(actualTotal, currency)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* ── PLANNER TAB ── */
                  <div className="p-4 space-y-5">
                    {/* Summary card */}
                    <div className="rounded-card bg-[var(--bg-2)] p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-3)]">Planned Expenses</span>
                        <span className="font-mono font-medium text-[var(--text-1)]">
                          {formatCurrency(plannedTotal, currency)}{' '}
                          <span className="text-[10px] text-[var(--text-4)]">
                            &middot; {formatCurrency(coveredExpenses, currency)} covered
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-3)]">Expected Income</span>
                        <span className="font-mono font-medium text-[var(--green)]">
                          {formatCurrency(incomeTotal, currency)}{' '}
                          <span className="text-[10px] text-[var(--text-4)]">
                            &middot; {formatCurrency(receivedIncome, currency)} received
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--border)] pt-2 text-sm">
                        <span className="font-semibold text-[var(--text-1)]">Net Position</span>
                        <span
                          className={`font-mono font-bold ${
                            netPosition >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                          }`}
                        >
                          {netPosition >= 0 ? '+' : ''}
                          {formatCurrency(netPosition, currency)}
                        </span>
                      </div>
                    </div>

                    {/* ── Planned Expenses section ── */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--red)]">
                          Planned Expenses
                        </h3>
                        <span className="font-mono text-xs text-[var(--text-3)]">
                          {formatCurrency(remainingExpenses, currency)} remaining
                        </span>
                      </div>

                      {plannedExpenses.length === 0 && !showExpenseForm ? (
                        <p className="py-4 text-center text-sm text-[var(--text-4)]">
                          No planned expenses yet
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {plannedExpenses.map((pe) => (
                            <div
                              key={pe.id}
                              className={`flex items-center gap-3 rounded-card border px-3 py-2.5 ${
                                pe.is_completed
                                  ? 'border-[var(--border)] bg-[var(--bg-2)] opacity-50'
                                  : 'border-[var(--card-border)] bg-[var(--card-bg)]'
                              }`}
                            >
                              <button
                                onClick={() => togglePE(pe.id, pe.is_completed)}
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                                  pe.is_completed
                                    ? 'border-[var(--green)] bg-[var(--green)]'
                                    : 'border-[#D4D4D4]'
                                }`}
                              >
                                {pe.is_completed && (
                                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm text-[var(--text-1)] ${pe.is_completed ? 'line-through' : ''}`}>
                                  {pe.description}
                                </p>
                                <p className="text-[10px] text-[var(--text-4)]">{pe.category}</p>
                              </div>
                              <span
                                className={`font-mono text-sm font-medium shrink-0 ${
                                  pe.is_completed ? 'text-[var(--text-4)] line-through' : 'text-[var(--red)]'
                                }`}
                              >
                                {formatCurrency(pe.planned_amount, currency)}
                              </span>
                              <button
                                onClick={() => deletePE(pe.id)}
                                className="shrink-0 text-[var(--text-4)] hover:text-[var(--red)]"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {showExpenseForm ? (
                        <form
                          onSubmit={addExpense}
                          className="mt-3 space-y-3 rounded-card border border-[var(--accent)]/20 bg-[rgba(79,70,229,0.02)] p-4"
                        >
                          <select
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                            className={inputClass}
                          >
                            {EXPENSE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Description"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                            <input
                              type="checkbox"
                              checked={expenseForm.is_recurring}
                              onChange={(e) => setExpenseForm({ ...expenseForm, is_recurring: e.target.checked })}
                            />
                            Recurring monthly
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={saving}
                              className="flex-1 rounded-btn bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {saving ? 'Adding...' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowExpenseForm(false)}
                              className="rounded-btn border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-3)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowExpenseForm(true)}
                          className="mt-2 w-full rounded-btn border border-dashed border-[var(--red)]/30 py-2.5 text-sm font-medium text-[var(--red)] hover:bg-[var(--red-bg)]"
                        >
                          + Add Planned Expense
                        </button>
                      )}
                    </div>

                    {/* ── Expected Income section ── */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--green)]">
                          Expected Income
                        </h3>
                        <span className="font-mono text-xs text-[var(--text-3)]">
                          {formatCurrency(pendingIncome, currency)} pending
                        </span>
                      </div>

                      {plannedIncome.length === 0 && !showIncomeForm ? (
                        <p className="py-4 text-center text-sm text-[var(--text-4)]">
                          No expected income yet
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {plannedIncome.map((pi) => (
                            <div
                              key={pi.id}
                              className={`flex items-center gap-3 rounded-card border px-3 py-2.5 ${
                                pi.is_completed
                                  ? 'border-[var(--border)] bg-[var(--bg-2)] opacity-50'
                                  : 'border-[var(--card-border)] bg-[var(--card-bg)]'
                              }`}
                            >
                              <button
                                onClick={() => togglePI(pi.id, pi.is_completed)}
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                                  pi.is_completed
                                    ? 'border-[var(--green)] bg-[var(--green)]'
                                    : 'border-[#D4D4D4]'
                                }`}
                              >
                                {pi.is_completed && (
                                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm text-[var(--text-1)] ${pi.is_completed ? 'line-through' : ''}`}>
                                  {pi.description}
                                </p>
                                <p className="text-[10px] text-[var(--text-4)]">
                                  {pi.category}
                                  {pi.expected_date ? ` \u00B7 Due ${pi.expected_date}` : ''}
                                </p>
                              </div>
                              <span
                                className={`font-mono text-sm font-medium shrink-0 ${
                                  pi.is_completed ? 'text-[var(--text-4)] line-through' : 'text-[var(--green)]'
                                }`}
                              >
                                {formatCurrency(pi.planned_amount, currency)}
                              </span>
                              <button
                                onClick={() => deletePI(pi.id)}
                                className="shrink-0 text-[var(--text-4)] hover:text-[var(--red)]"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {showIncomeForm ? (
                        <form
                          onSubmit={addIncome}
                          className="mt-3 space-y-3 rounded-card border border-[var(--green)]/20 bg-[rgba(22,163,74,0.02)] p-4"
                        >
                          <select
                            value={incomeForm.category}
                            onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                            className={inputClass}
                          >
                            {INCOME_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Description"
                            value={incomeForm.description}
                            onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <input
                            type="number"
                            placeholder="Expected amount"
                            value={incomeForm.amount}
                            onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                            className={inputClass}
                            required
                          />
                          <input
                            type="date"
                            value={incomeForm.expected_date}
                            onChange={(e) => setIncomeForm({ ...incomeForm, expected_date: e.target.value })}
                            className={inputClass}
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={saving}
                              className="flex-1 rounded-btn bg-[var(--green)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {saving ? 'Adding...' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowIncomeForm(false)}
                              className="rounded-btn border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-3)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowIncomeForm(true)}
                          className="mt-2 w-full rounded-btn border border-dashed border-[var(--green)]/30 py-2.5 text-sm font-medium text-[var(--green)] hover:bg-[var(--green-bg)]"
                        >
                          + Add Expected Income
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
