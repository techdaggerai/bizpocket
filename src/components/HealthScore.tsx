'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { getCurrentMonth } from '@/lib/utils';

interface ScoreBreakdown {
  cashFlowTrend: number;
  invoicePaymentRate: number;
  expenseRatio: number;
  unpaidInvoices: number;
  documentCompleteness: number;
}

function getScoreColor(score: number): string {
  if (score > 70) return 'text-[#16A34A]';
  if (score >= 50) return 'text-[#F59E0B]';
  return 'text-[#DC2626]';
}

function getScoreBg(score: number): string {
  if (score > 70) return 'bg-[#16A34A]';
  if (score >= 50) return 'bg-[#F59E0B]';
  return 'bg-[#DC2626]';
}

function getScoreLabel(score: number): string {
  if (score > 80) return 'Excellent';
  if (score > 70) return 'Good';
  if (score >= 50) return 'Needs attention';
  return 'Critical';
}

export default function HealthScore() {
  const { organization } = useAuth();
  const supabase = createClient();
  const orgId = organization?.id;
  const [score, setScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);

  const calculate = useCallback(async () => {
    setLoading(true);
    const month = getCurrentMonth();

    const [flowRes, invRes, docRes] = await Promise.all([
      supabase
        .from('cash_flows')
        .select('amount, flow_type, classify_as')
        .eq('organization_id', orgId)
        .gte('date', month + '-01')
        .lt('date', (() => { const [y,m] = month.split('-'); return new Date(Number(y), Number(m), 1).toISOString().slice(0, 10); })()),
      supabase
        .from('invoices')
        .select('status, total')
        .eq('organization_id', orgId),
      supabase
        .from('documents')
        .select('id')
        .eq('organization_id', orgId),
    ]);

    const flows = flowRes.data || [];
    const invoices = invRes.data || [];
    const docs = docRes.data || [];

    // 1. Cash flow trend (20 pts): positive net = 20, break even = 10, negative = 0-5
    const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
    const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
    const net = totalIn - totalOut;
    let cashFlowScore: number;
    if (flows.length === 0) cashFlowScore = 10; // neutral if no data
    else if (net > 0) cashFlowScore = 20;
    else if (net === 0) cashFlowScore = 10;
    else cashFlowScore = Math.max(0, 10 + Math.floor((net / totalOut) * 10));

    // 2. Invoice payment rate (25 pts)
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
    const paymentRate = totalInvoices > 0 ? paidInvoices / totalInvoices : 1;
    const invoiceScore = Math.round(paymentRate * 25);

    // 3. Expense ratio (20 pts): lower is better
    const expenseRatio = totalIn > 0 ? totalOut / totalIn : (totalOut > 0 ? 2 : 0);
    let expenseScore: number;
    if (flows.length === 0) expenseScore = 10;
    else if (expenseRatio <= 0.5) expenseScore = 20;
    else if (expenseRatio <= 0.8) expenseScore = 15;
    else if (expenseRatio <= 1) expenseScore = 10;
    else expenseScore = 5;

    // 4. Unpaid invoices (20 pts): fewer is better
    const unpaidCount = invoices.filter((i) => i.status !== 'paid').length;
    let unpaidScore: number;
    if (unpaidCount === 0) unpaidScore = 20;
    else if (unpaidCount <= 2) unpaidScore = 15;
    else if (unpaidCount <= 5) unpaidScore = 10;
    else unpaidScore = 5;

    // 5. Document completeness (15 pts)
    const docCount = docs.length;
    let docScore: number;
    if (docCount >= 10) docScore = 15;
    else if (docCount >= 5) docScore = 10;
    else if (docCount >= 1) docScore = 7;
    else docScore = 3;

    const totalScore = Math.min(100, cashFlowScore + invoiceScore + expenseScore + unpaidScore + docScore);

    setScore(totalScore);
    setBreakdown({
      cashFlowTrend: cashFlowScore,
      invoicePaymentRate: invoiceScore,
      expenseRatio: expenseScore,
      unpaidInvoices: unpaidScore,
      documentCompleteness: docScore,
    });
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { calculate(); }, [calculate]);

  if (loading) {
    return (
      <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-center">
        <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (score === null) return null;

  const breakdownItems = breakdown ? [
    { label: 'Cash Flow Trend', score: breakdown.cashFlowTrend, max: 20 },
    { label: 'Invoice Payment Rate', score: breakdown.invoicePaymentRate, max: 25 },
    { label: 'Expense Ratio', score: breakdown.expenseRatio, max: 20 },
    { label: 'Unpaid Invoices', score: breakdown.unpaidInvoices, max: 20 },
    { label: 'Document Completeness', score: breakdown.documentCompleteness, max: 15 },
  ] : [];

  return (
    <div>
      <div
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="cursor-pointer rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-center transition-shadow hover:shadow-sm"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Business Health</p>
        <p className={`mt-1 font-mono text-4xl font-bold ${getScoreColor(score)}`}>{score}</p>
        <p className={`mt-1 text-sm ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-3)]">
          <div
            className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-4)]">Tap for breakdown</p>
      </div>

      {showBreakdown && (
        <div className="mt-2 space-y-2 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <h4 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Score Breakdown</h4>
          {breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-2)]">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-3)]">
                  <div
                    className={`h-full rounded-full ${getScoreBg(Math.round((item.score / item.max) * 100))}`}
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-[var(--text-3)]">{item.score}/{item.max}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
