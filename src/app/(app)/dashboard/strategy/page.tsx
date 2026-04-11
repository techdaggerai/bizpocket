'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/PageHeader';
import PlanHeader from '@/components/strategy/PlanHeader';
import DailyLimitsCard from '@/components/strategy/DailyLimitsCard';
import RulesManager, { type Rule } from '@/components/strategy/RulesManager';
import RuleSuggestions from '@/components/strategy/RuleSuggestions';

interface TradingPlan {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  rules: Rule[];
  max_daily_loss: number | null;
  max_daily_trades: number | null;
  max_position_size: number | null;
  allowed_hours_start: string | null;
  allowed_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PLAN: Omit<TradingPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  name: 'My Trading Plan',
  is_active: true,
  rules: [],
  max_daily_loss: null,
  max_daily_trades: null,
  max_position_size: null,
  allowed_hours_start: null,
  allowed_hours_end: null,
};

export default function StrategyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [plan, setPlan] = useState<TradingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the user's active plan (or first plan)
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      // Try active plan first
      const { data: activePlan } = await supabase
        .from('trading_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (activePlan) {
        setPlan(activePlan as TradingPlan);
      } else {
        // Fallback: any plan
        const { data: anyPlan } = await supabase
          .from('trading_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setPlan(anyPlan as TradingPlan | null);
      }
    } catch {
      // No plan exists yet
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [user.id, supabase]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Auto-save with debounce
  const savePlan = useCallback(async (updated: Partial<TradingPlan>) => {
    if (!plan) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trading_plans')
        .update({ ...updated, updated_at: new Date().toISOString() })
        .eq('id', plan.id)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch {
      toast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  }, [plan, supabase, toast, user.id]);

  function debouncedSave(updated: Partial<TradingPlan>) {
    if (saveTimeout) clearTimeout(saveTimeout);
    const t = setTimeout(() => savePlan(updated), 600);
    setSaveTimeout(t);
  }

  // Create a new plan
  async function createPlan() {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trading_plans')
        .insert({
          user_id: user.id,
          ...DEFAULT_PLAN,
        })
        .select()
        .single();
      if (error) throw error;
      setPlan(data as TradingPlan);
      toast('Trading plan created', 'success');
    } catch {
      toast('Failed to create plan', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Field updaters
  function updateField(field: string, value: any) {
    if (!plan) return;
    const updated = { ...plan, [field]: value };
    setPlan(updated);
    debouncedSave({ [field]: value });
  }

  function handleNameChange(name: string) {
    updateField('name', name);
  }

  function handleActiveToggle(active: boolean) {
    updateField('is_active', active);
  }

  function handleLimitChange(field: string, value: number | string | null) {
    updateField(field, value);
  }

  function handleRulesChange(rules: Rule[]) {
    if (!plan) return;
    const updated = { ...plan, rules };
    setPlan(updated);
    debouncedSave({ rules });
  }

  function handleAddSuggestedRule(rule: Omit<Rule, 'id'>) {
    if (!plan) return;
    const existingNums = plan.rules.map((r) => {
      const m = r.id.match(/^r(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newRule: Rule = { id: `r${nextNum}`, ...rule };
    const updatedRules = [...plan.rules, newRule];
    const updated = { ...plan, rules: updatedRules };
    setPlan(updated);
    debouncedSave({ rules: updatedRules });
    toast('Rule added', 'success');
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <PageHeader title="Strategy" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[20px] bg-slate-800/60 border border-[var(--border)] h-[120px] animate-pulse" />
        ))}
      </div>
    );
  }

  // No plan — empty state
  if (!plan) {
    return (
      <div className="space-y-4 py-2">
        <PageHeader title="Strategy" />
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#AB7B5A]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#AB7B5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--pm-text-primary)]">No Trading Plan Yet</h2>
          <p className="text-sm text-[var(--pm-text-tertiary)] text-center max-w-xs">
            Create your first trading plan to define rules, set limits, and build discipline.
          </p>
          <button
            onClick={createPlan}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#AB7B5A] text-white font-semibold hover:bg-[#AB7B5A]/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Trading Plan'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <PageHeader
        title="Strategy"
        rightAction={
          saving ? (
            <span className="text-[11px] text-[var(--pm-text-tertiary)] animate-pulse">Saving...</span>
          ) : null
        }
      />

      {/* Section 1: Plan Header */}
      <PlanHeader
        name={plan.name}
        isActive={plan.is_active}
        createdAt={plan.created_at}
        onNameChange={handleNameChange}
        onActiveToggle={handleActiveToggle}
      />

      {/* Section 2: Daily Limits */}
      <DailyLimitsCard
        maxDailyLoss={plan.max_daily_loss}
        maxDailyTrades={plan.max_daily_trades}
        maxPositionSize={plan.max_position_size}
        allowedHoursStart={plan.allowed_hours_start}
        allowedHoursEnd={plan.allowed_hours_end}
        onChange={handleLimitChange}
      />

      {/* Section 3: Trading Rules */}
      <RulesManager
        rules={plan.rules || []}
        onRulesChange={handleRulesChange}
      />

      {/* Section 4: AI Rule Suggestions */}
      <RuleSuggestions
        existingRules={plan.rules || []}
        onAddRule={handleAddSuggestedRule}
      />
    </div>
  );
}
