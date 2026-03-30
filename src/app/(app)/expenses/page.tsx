'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, getCurrentMonth, getMonthRange, formatDate } from '@/lib/utils';
import type { CashFlow, PlannedExpense, PlannedIncome } from '@/types/database';

const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Utility', 'Fuel', 'Food', 'Repair Cost', 'Parts',
  'Shipping', 'Tax', 'Insurance', 'Office Expense', 'Other',
];

const INCOME_CATEGORIES = [
  'Customer Payment', 'Sale Revenue', 'Settlement', 'Loan Return', 'Refund', 'Other',
];

type Tab = 'actual' | 'planner';

export default function ExpensesPage() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  // Current + 3 forward months
  const allMonths = getMonthRange(12);
  const now = getCurrentMonth();
  const futureMonths = [now];
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    futureMonths.push(d.toISOString().slice(0, 7));
  }

  const [expandedMonth, setExpandedMonth] = useState(now);
  const [tab, setTab] = useState<Tab>('actual');
  const [loading, setLoading] = useState(true);

  // Actual data (from cash_flows classified as expense)
  const [actuals, setActuals] = useState<CashFlow[]>([]);
  // Planner data
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [plannedIncome, setPlannedIncome] = useState<PlannedIncome[]>([]);

  // Forms
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [expForm, setExpForm] = useState({ category: EXPENSE_CATEGORIES[0], description: '', amount: '', notes: '', is_recurring: false });
  const [incForm, setIncForm] = useState({ category: INCOME_CATEGORIES[0], description: '', amount: '', expected_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Quick add expense (actual)
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [quickNotes, setQuickNotes] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const m = expandedMonth;
    const [actualRes, plannedExpRes, plannedIncRes] = await Promise.all([
      supabase
        .from('cash_flows')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('classify_as', 'expense')
        .gte('date', m + '-01')
        .lte('date', m + '-31')
        .order('date', { ascending: false }),
      supabase
        .from('planned_expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month', m + '-01'),
      supabase
        .from('planned_income')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month', m + '-01'),
    ]);
    setActuals(actualRes.data || []);
    setPlannedExpenses(plannedExpRes.data || []);
    setPlannedIncome(plannedIncRes.data || []);
    setLoading(false);
  }, [expandedMonth, organization.id, supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Calculations
  const actualTotal = actuals.reduce((s, e) => s + e.amount, 0);
  const plannedExpTotal = plannedExpenses.reduce((s, e) => s + e.planned_amount, 0);
  const coveredExpTotal = plannedExpenses.filter((e) => e.is_completed).reduce((s, e) => s + e.planned_amount, 0);
  const remainingExp = plannedExpTotal - coveredExpTotal;
  const plannedIncTotal = plannedIncome.reduce((s, e) => s + e.planned_amount, 0);
  const receivedIncTotal = plannedIncome.filter((e) => e.is_completed).reduce((s, e) => s + e.planned_amount, 0);
  const pendingInc = plannedIncTotal - receivedIncTotal;
  const variance = plannedExpTotal - actualTotal;
  const netPosition = pendingInc - remainingExp;

  const byCategory = actuals.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  // Quick add actual expense
  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    setQuickSaving(true);
    const { error } = await supabase.from('cash_flows').insert({
      organization_id: organization.id,
      date: new Date().toISOString().slice(0, 10),
      flow_type: 'OUT',
      amount: parseFloat(quickAmount) || 0,
      currency,
      category: quickCategory,
      from_to: '',
      description: quickNotes || null,
      status: 'COMPLETED',
      classify_as: 'expense',
    });
    setQuickSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast('Expense logged', 'success');
      setQuickAmount(''); setQuickNotes(''); setShowQuickAdd(false);
      fetchAll();
    }
  }

  // Add planned expense
  async function handleAddPlannedExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('planned_expenses').insert({
      organization_id: organization.id,
      month: expandedMonth + '-01',
      category: expForm.category,
      description: expForm.description || null,
      planned_amount: parseInt(expForm.amount) || 0,
      is_recurring: expForm.is_recurring,
      notes: expForm.notes || null,
    });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast('Planned expense added', 'success');
      setExpForm({ category: EXPENSE_CATEGORIES[0], description: '', amount: '', notes: '', is_recurring: false });
      setShowExpenseForm(false);
      fetchAll();
    }
  }

  // Add planned income
  async function handleAddPlannedIncome(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('planned_income').insert({
      organization_id: organization.id,
      month: expandedMonth + '-01',
      category: incForm.category,
      description: incForm.description,
      planned_amount: parseInt(incForm.amount) || 0,
      expected_date: incForm.expected_date || null,
      notes: incForm.notes || null,
    });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast('Expected income added', 'success');
      setIncForm({ category: INCOME_CATEGORIES[0], description: '', amount: '', expected_date: '', notes: '' });
      setShowIncomeForm(false);
      fetchAll();
    }
  }

  // Toggle completion
  async function togglePlannedExpense(id: string, current: boolean) {
    await supabase.from('planned_expenses').update({ is_completed: !current }).eq('id', id);
    fetchAll();
  }

  async function togglePlannedIncome(id: string, current: boolean) {
    await supabase.from('planned_income').update({ is_completed: !current }).eq('id', id);
    fetchAll();
  }

  async function deletePlannedExpense(id: string) {
    await supabase.from('planned_expenses').delete().eq('id', id);
    toast('Removed', 'success');
    fetchAll();
  }

  async function deletePlannedIncome(id: string) {
    await supabase.from('planned_income').delete().eq('id', id);
    toast('Removed', 'success');
    fetchAll();
  }

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  function monthLabel(m: string) {
    const d = new Date(m + '-01');
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-1)]">Expenses & Planner</h1>
        <p className="text-xs text-[var(--text-3)]">Actual vs Planned — track every yen</p>
      </div>

      {/* Month Accordion */}
      <div className="space-y-2">
        {futureMonths.map((m) => {
          const isExpanded = expandedMonth === m;
          return (
            <div key={m} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
              {/* Month Header */}
              <button
                onClick={() => setExpandedMonth(isExpanded ? '' : m)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{isExpanded ? '\u25BC' : '\u25B6'} {monthLabel(m)}</p>
                  {!isExpanded && (
                    <p className="text-[10px] text-[var(--text-4)] mt-0.5">
                      Planned: {formatCurrency(plannedExpTotal, currency)} | Actual: {formatCurrency(actualTotal, currency)}
                    </p>
                  )}
                </div>
                {m === now && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-white">Current</span>}
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border)] px-4 pb-4">
                  {/* Variance Summary */}
                  <div className="grid grid-cols-3 gap-2 py-3">
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-4)] uppercase">Planned</p>
                      <p className="font-mono text-sm font-semibold text-[var(--text-1)]">{formatCurrency(plannedExpTotal, currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-4)] uppercase">Actual</p>
                      <p className="font-mono text-sm font-semibold text-[#DC2626]">{formatCurrency(actualTotal, currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-[var(--text-4)] uppercase">Variance</p>
                      <p className={`font-mono text-sm font-semibold ${variance >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {variance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(variance), currency)}
                      </p>
                      <p className="text-[9px] text-[var(--text-4)]">{variance >= 0 ? 'Under budget' : 'Over budget'}</p>
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => setTab('actual')}
                      className={`flex-1 rounded-btn py-2 text-xs font-medium transition-colors ${tab === 'actual' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'}`}
                    >
                      Actual
                    </button>
                    <button
                      onClick={() => setTab('planner')}
                      className={`flex-1 rounded-btn py-2 text-xs font-medium transition-colors ${tab === 'planner' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'}`}
                    >
                      Planner
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    </div>
                  ) : tab === 'actual' ? (
                    /* ===== ACTUAL TAB ===== */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-[var(--text-4)] uppercase">Auto-synced from Cash Flow</p>
                        <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="text-xs text-[var(--accent)]">
                          {showQuickAdd ? 'Cancel' : '+ Quick Add'}
                        </button>
                      </div>

                      {showQuickAdd && (
                        <form onSubmit={handleQuickAdd} className="space-y-2 rounded-lg border border-[var(--border)] p-3">
                          <input type="number" inputMode="numeric" value={quickAmount} onChange={(e) => setQuickAmount(e.target.value)} placeholder="Amount" className={inputClass} required autoFocus />
                          <select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)} className={inputClass}>
                            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} placeholder="Notes" className={inputClass} />
                          <button type="submit" disabled={quickSaving} className="w-full rounded-btn bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-50">
                            {quickSaving ? 'Saving...' : 'Log Expense'}
                          </button>
                        </form>
                      )}

                      {/* Category Breakdown */}
                      {Object.keys(byCategory).length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                            <div key={cat} className="rounded-lg bg-[var(--bg-2)] p-2.5">
                              <p className="text-[10px] text-[var(--text-4)]">{cat}</p>
                              <p className="font-mono text-sm font-medium text-[var(--text-1)]">{formatCurrency(amt, currency)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expense List */}
                      {actuals.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[var(--text-4)]">No expenses recorded this month</p>
                      ) : (
                        <div className="space-y-1.5">
                          {actuals.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-2)] px-3 py-2.5">
                              <div>
                                <p className="text-sm font-medium text-[var(--text-1)]">{exp.category}</p>
                                <p className="text-[10px] text-[var(--text-4)]">{formatDate(exp.date)}{exp.description ? ` \u00B7 ${exp.description}` : ''}</p>
                              </div>
                              <span className="font-mono text-sm font-medium text-[#DC2626]">-{formatCurrency(exp.amount, currency)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg bg-[#DC2626]/5 border border-[#DC2626]/15 p-3 text-center">
                        <p className="text-[10px] text-[var(--text-4)] uppercase">Total Actual Expenses</p>
                        <p className="font-mono text-lg font-bold text-[#DC2626]">{formatCurrency(actualTotal, currency)}</p>
                      </div>
                    </div>
                  ) : (
                    /* ===== PLANNER TAB ===== */
                    <div className="space-y-4">
                      {/* Planner Summary */}
                      <div className="rounded-lg border border-[var(--accent)]/15 bg-[var(--accent)]/3 p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-3)]">Planned Expenses</span>
                          <span className="font-mono text-[var(--text-1)]">{formatCurrency(plannedExpTotal, currency)} total | {formatCurrency(coveredExpTotal, currency)} covered | {formatCurrency(remainingExp, currency)} remaining</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-3)]">Expected Income</span>
                          <span className="font-mono text-[var(--text-1)]">{formatCurrency(plannedIncTotal, currency)} total | {formatCurrency(receivedIncTotal, currency)} received | {formatCurrency(pendingInc, currency)} pending</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-1.5 flex justify-between text-xs font-semibold">
                          <span className={netPosition >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}>Net Position</span>
                          <span className={`font-mono ${netPosition >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition, currency)}
                          </span>
                        </div>
                      </div>

                      {/* PLANNED EXPENSES Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">Planned Expenses</p>
                          <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="text-xs text-[var(--accent)]">
                            {showExpenseForm ? 'Cancel' : '+ Add'}
                          </button>
                        </div>

                        {showExpenseForm && (
                          <form onSubmit={handleAddPlannedExpense} className="space-y-2 rounded-lg border border-[var(--border)] p-3 mb-3">
                            <select value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className={inputClass}>
                              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Description" className={inputClass} />
                            <input type="number" inputMode="numeric" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="Planned amount" className={inputClass} required />
                            <input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} placeholder="Notes (optional)" className={inputClass} />
                            <button type="submit" disabled={saving} className="w-full rounded-btn bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-50">
                              {saving ? 'Saving...' : 'Add Planned Expense'}
                            </button>
                          </form>
                        )}

                        {plannedExpenses.length === 0 ? (
                          <p className="py-4 text-center text-xs text-[var(--text-4)]">No planned expenses yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {[...plannedExpenses].sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0)).map((pe) => (
                              <div key={pe.id} className={`flex items-center gap-3 rounded-lg bg-[var(--bg-2)] px-3 py-2.5 ${pe.is_completed ? 'opacity-50' : ''}`}>
                                <button
                                  onClick={() => togglePlannedExpense(pe.id, pe.is_completed)}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${pe.is_completed ? 'border-[#16A34A] bg-[#16A34A]' : 'border-[var(--border-strong)]'}`}
                                >
                                  {pe.is_completed && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium text-[var(--text-1)] ${pe.is_completed ? 'line-through' : ''}`}>{pe.category}</p>
                                  {pe.description && <p className="text-[10px] text-[var(--text-4)] truncate">{pe.description}</p>}
                                </div>
                                <span className={`font-mono text-sm font-medium text-[#DC2626] ${pe.is_completed ? 'line-through' : ''}`}>{formatCurrency(pe.planned_amount, currency)}</span>
                                <button onClick={() => deletePlannedExpense(pe.id)} className="text-[10px] text-[var(--text-4)] hover:text-[#DC2626]">x</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* EXPECTED INCOME Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">Expected Income</p>
                          <button onClick={() => setShowIncomeForm(!showIncomeForm)} className="text-xs text-[var(--accent)]">
                            {showIncomeForm ? 'Cancel' : '+ Add'}
                          </button>
                        </div>

                        {showIncomeForm && (
                          <form onSubmit={handleAddPlannedIncome} className="space-y-2 rounded-lg border border-[var(--border)] p-3 mb-3">
                            <select value={incForm.category} onChange={(e) => setIncForm({ ...incForm, category: e.target.value })} className={inputClass}>
                              {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} placeholder="Description (e.g. Rashid payment)" className={inputClass} required />
                            <input type="number" inputMode="numeric" value={incForm.amount} onChange={(e) => setIncForm({ ...incForm, amount: e.target.value })} placeholder="Expected amount" className={inputClass} required />
                            <input type="date" value={incForm.expected_date} onChange={(e) => setIncForm({ ...incForm, expected_date: e.target.value })} className={inputClass} />
                            <input value={incForm.notes} onChange={(e) => setIncForm({ ...incForm, notes: e.target.value })} placeholder="Notes (optional)" className={inputClass} />
                            <button type="submit" disabled={saving} className="w-full rounded-btn bg-[#16A34A] py-2 text-sm font-medium text-white disabled:opacity-50">
                              {saving ? 'Saving...' : 'Add Expected Income'}
                            </button>
                          </form>
                        )}

                        {plannedIncome.length === 0 ? (
                          <p className="py-4 text-center text-xs text-[var(--text-4)]">No expected income yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {[...plannedIncome].sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0)).map((pi) => (
                              <div key={pi.id} className={`flex items-center gap-3 rounded-lg bg-[var(--bg-2)] px-3 py-2.5 ${pi.is_completed ? 'opacity-50' : ''}`}>
                                <button
                                  onClick={() => togglePlannedIncome(pi.id, pi.is_completed)}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${pi.is_completed ? 'border-[#16A34A] bg-[#16A34A]' : 'border-[var(--border-strong)]'}`}
                                >
                                  {pi.is_completed && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium text-[var(--text-1)] ${pi.is_completed ? 'line-through' : ''}`}>{pi.description}</p>
                                  <p className="text-[10px] text-[var(--text-4)]">{pi.category}{pi.expected_date ? ` \u00B7 ${formatDate(pi.expected_date)}` : ''}</p>
                                </div>
                                <span className={`font-mono text-sm font-medium text-[#16A34A] ${pi.is_completed ? 'line-through' : ''}`}>+{formatCurrency(pi.planned_amount, currency)}</span>
                                <button onClick={() => deletePlannedIncome(pi.id)} className="text-[10px] text-[var(--text-4)] hover:text-[#DC2626]">x</button>
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}
