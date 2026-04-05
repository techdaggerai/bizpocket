'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface Stage { id: string; name: string; color: string; stage_order: number; is_start: boolean; is_end: boolean; }
interface Item {
  id: string; name: string; category: string; current_stage_id: string;
  purchase_price: number; sale_price: number; total_cost: number; profit: number;
  status: string; priority: string; entered_current_stage_at: string;
  created_at: string; stakeholder_id: string | null;
}
interface Stakeholder { id: string; name: string; type: string; total_invested: number; total_returned: number; }
interface Transition { id: string; item_id: string; from_stage_id: string; to_stage_id: string; days_in_previous_stage: number; transitioned_at: string; }

export default function OpsRadarPage() {
  const { organization } = useAuth();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [loading, setLoading] = useState(true);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleName, setCycleName] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: cycle } = await supabase
      .from('business_cycles')
      .select('id, name')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!cycle) { setLoading(false); return; }
    setCycleId(cycle.id);
    setCycleName(cycle.name);

    const [stagesRes, itemsRes, stakeholdersRes, transitionsRes] = await Promise.all([
      supabase.from('cycle_stages').select('*').eq('cycle_id', cycle.id).order('stage_order'),
      supabase.from('cycle_items').select('*').eq('cycle_id', cycle.id).order('created_at', { ascending: false }),
      supabase.from('stakeholders').select('*').eq('organization_id', organization.id),
      supabase.from('cycle_transitions').select('*').eq('organization_id', organization.id).order('transitioned_at', { ascending: false }).limit(100),
    ]);

    setStages(stagesRes.data || []);
    setItems((itemsRes.data || []) as Item[]);
    setStakeholders((stakeholdersRes.data || []) as Stakeholder[]);
    setTransitions((transitionsRes.data || []) as Transition[]);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeItems = items.filter(i => i.status === 'active');
  const completedItems = items.filter(i => i.status === 'completed');
  const itemsByStage = stages.map(s => ({
    stage: s,
    items: activeItems.filter(i => i.current_stage_id === s.id),
  }));
  const totalPipelineValue = activeItems.reduce((s, i) => s + (i.purchase_price || 0), 0);
  const totalCosts = activeItems.reduce((s, i) => s + (i.total_cost || 0), 0);
  const completedProfit = completedItems.reduce((s, i) => s + (i.profit || 0), 0);
  const avgDaysPerItem = completedItems.length > 0
    ? Math.round(completedItems.reduce((s, i) => {
        const start = new Date(i.created_at).getTime();
        const end = new Date(i.entered_current_stage_at || i.created_at).getTime();
        return s + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / completedItems.length)
    : 0;

  const stageAvgDays = stages.map(s => {
    const stageTrans = transitions.filter(t => t.from_stage_id === s.id && t.days_in_previous_stage != null);
    const avg = stageTrans.length > 0 ? stageTrans.reduce((sum, t) => sum + t.days_in_previous_stage, 0) / stageTrans.length : 0;
    return { stage: s, avgDays: Math.round(avg * 10) / 10, count: stageTrans.length };
  });
  const bottleneckStage = stageAvgDays.length > 0
    ? stageAvgDays.reduce((max, s) => s.avgDays > max.avgDays ? s : max, stageAvgDays[0])
    : null;

  const filteredItems = selectedStage ? activeItems.filter(i => i.current_stage_id === selectedStage) : activeItems;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (!cycleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F46E5]/10">
          <svg className="h-8 w-8 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Set up your business cycle first</h2>
        <p className="text-sm text-[var(--text-3)] mb-4">Ops Radar needs a business cycle to track. Create one with AI in 2 minutes.</p>
        <Link href="/cycle-setup" className="rounded-xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors">
          Create Business Cycle
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Ops Radar" backPath="/dashboard" />
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Ops Radar<span className="ml-2 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">AI</span></h1>
          <p className="text-xs text-[var(--text-3)]">{cycleName}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/items" className="text-xs text-[#4F46E5] font-medium hover:underline">Manage Items</Link>
          <Link href="/cycle-setup" className="text-xs text-[var(--text-3)] font-medium hover:underline">Edit Cycle</Link>
        </div>
      </div>

      {/* Command Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setSelectedStage(null)}
          className={`shrink-0 rounded-lg px-3 py-2 text-center transition-all ${
            !selectedStage ? 'bg-[#4F46E5] text-white' : 'bg-slate-800 border border-slate-700 text-[var(--text-2)] hover:bg-[var(--bg-2)]'
          }`}
        >
          <p className="text-lg font-bold">{activeItems.length}</p>
          <p className="text-[9px] font-medium">All</p>
        </button>
        {itemsByStage.map(({ stage, items: stageItems }) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-center min-w-[60px] transition-all ${
              selectedStage === stage.id
                ? 'text-white'
                : 'bg-slate-800 border border-slate-700 text-[var(--text-2)] hover:bg-[var(--bg-2)]'
            }`}
            style={selectedStage === stage.id ? { backgroundColor: stage.color } : {}}
          >
            <p className="text-lg font-bold">{stageItems.length}</p>
            <p className="text-[9px] font-medium truncate max-w-[70px]">{stage.name}</p>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">Pipeline Value</p>
          <p className="text-lg font-bold font-mono text-[#4F46E5]">{formatCurrency(totalPipelineValue, currency)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">Total Costs</p>
          <p className="text-lg font-bold font-mono text-[#DC2626]">{formatCurrency(totalCosts, currency)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">Completed Profit</p>
          <p className="text-lg font-bold font-mono text-[#16A34A]">{formatCurrency(completedProfit, currency)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-wider">Avg Days/Item</p>
          <p className="text-lg font-bold font-mono text-[var(--text-1)]">{avgDaysPerItem || '\u2014'}</p>
        </div>
      </div>

      {/* Bottleneck Alert */}
      {bottleneckStage && bottleneckStage.avgDays > 0 && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/20">
            <svg className="h-4 w-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#92400E]">Bottleneck: {bottleneckStage.stage.name}</p>
            <p className="text-[10px] text-[#92400E]/70">Avg {bottleneckStage.avgDays} days \u2014 slowest stage in your cycle</p>
          </div>
        </div>
      )}

      {/* Pipeline Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">
            Pipeline {selectedStage ? `\u2014 ${stages.find(s => s.id === selectedStage)?.name}` : ''}
          </h2>
          <span className="text-[10px] text-[var(--text-4)]">{filteredItems.length} items</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800 p-8 text-center">
            <p className="text-sm text-[var(--text-3)]">No items in pipeline yet</p>
            <p className="text-[10px] text-[var(--text-4)] mt-1">Add your first item to start tracking</p>
            <Link href="/items" className="mt-3 inline-block rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white">+ Add Item</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const currentStage = stages.find(s => s.id === item.current_stage_id);
              const stageIndex = stages.findIndex(s => s.id === item.current_stage_id);
              const daysInStage = item.entered_current_stage_at
                ? Math.floor((Date.now() - new Date(item.entered_current_stage_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              return (
                <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-1)] truncate">{item.name}</p>
                      {item.category && <span className="text-[10px] text-[var(--text-4)]">{item.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.priority === 'urgent' && (
                        <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[9px] font-bold text-[#DC2626]">URGENT</span>
                      )}
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
                        style={{ backgroundColor: currentStage?.color || '#666' }}
                      >
                        {currentStage?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-0.5 mb-2">
                    {stages.map((s, i) => (
                      <div
                        key={s.id}
                        className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i <= stageIndex ? s.color : '#E5E5E5',
                          opacity: i === stageIndex ? 1 : i < stageIndex ? 0.6 : 0.3,
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-4)]">
                    <span>{daysInStage}d in stage</span>
                    <div className="flex gap-3">
                      {item.purchase_price > 0 && <span>Cost: {formatCurrency(item.purchase_price, currency)}</span>}
                      {item.sale_price > 0 && <span className="text-[#16A34A]">Sale: {formatCurrency(item.sale_price, currency)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stakeholders */}
      {stakeholders.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)] mb-3">Stakeholders</h2>
          <div className="grid grid-cols-2 gap-2">
            {stakeholders.map((sh) => (
              <div key={sh.id} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                <p className="text-sm font-semibold text-[var(--text-1)]">{sh.name}</p>
                <span className="text-[9px] uppercase text-[var(--text-4)] tracking-wider">{sh.type}</span>
                <div className="mt-2 flex justify-between text-[10px]">
                  <span className="text-[var(--text-4)]">Invested</span>
                  <span className="font-mono text-[var(--text-1)]">{formatCurrency(sh.total_invested, currency)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-4)]">Returned</span>
                  <span className="font-mono text-[#16A34A]">{formatCurrency(sh.total_returned, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Performance */}
      {stageAvgDays.some(s => s.count > 0) && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)] mb-3">Stage Performance</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
            {stageAvgDays.map((s, i) => (
              <div key={s.stage.id} className={`flex items-center justify-between px-3 py-2.5 ${i > 0 ? 'border-t border-slate-700' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.stage.color }} />
                  <span className="text-xs text-[var(--text-1)]">{s.stage.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--text-4)]">{s.count} items processed</span>
                  <span className={`font-mono text-xs font-medium ${s === bottleneckStage && s.avgDays > 0 ? 'text-[#F59E0B]' : 'text-[var(--text-1)]'}`}>
                    {s.avgDays > 0 ? `${s.avgDays}d avg` : '\u2014'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5 p-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[#4F46E5] mb-3">Summary</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-[var(--text-3)]">Active in pipeline</span><span className="font-semibold text-[var(--text-1)]">{activeItems.length} items</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-3)]">Completed</span><span className="font-semibold text-[var(--text-1)]">{completedItems.length} items</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-3)]">Capital deployed</span><span className="font-semibold font-mono text-[var(--text-1)]">{formatCurrency(totalPipelineValue, currency)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-3)]">Total profit (completed)</span><span className="font-semibold font-mono text-[#16A34A]">{formatCurrency(completedProfit, currency)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-3)]">Stakeholders</span><span className="font-semibold text-[var(--text-1)]">{stakeholders.length}</span></div>
        </div>
      </div>
    </div>
  );
}
