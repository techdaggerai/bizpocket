'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface Stage { id: string; name: string; color: string; stage_order: number; }
interface Item {
  id: string; name: string; category: string; reference_id: string;
  current_stage_id: string; purchase_price: number; sale_price: number;
  total_cost: number; status: string; priority: string; supplier: string;
  entered_current_stage_at: string; created_at: string; metadata: Record<string, unknown>;
}

export default function ItemsPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [loading, setLoading] = useState(true);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', reference_id: '',
    purchase_price: '', supplier: '', priority: 'normal',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: cycle } = await supabase
      .from('business_cycles').select('id').eq('organization_id', organization.id).eq('is_active', true).limit(1).maybeSingle();

    if (!cycle) { setLoading(false); return; }
    setCycleId(cycle.id);

    const [stagesRes, itemsRes] = await Promise.all([
      supabase.from('cycle_stages').select('*').eq('cycle_id', cycle.id).order('stage_order'),
      supabase.from('cycle_items').select('*').eq('cycle_id', cycle.id).order('created_at', { ascending: false }),
    ]);
    setStages(stagesRes.data || []);
    setItems((itemsRes.data || []) as Item[]);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !cycleId) return;
    setSaving(true);

    const firstStage = stages.find(s => s.stage_order === Math.min(...stages.map(st => st.stage_order)));

    const { error } = await supabase.from('cycle_items').insert({
      organization_id: organization.id,
      cycle_id: cycleId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      reference_id: form.reference_id.trim() || null,
      purchase_price: parseInt(form.purchase_price) || 0,
      supplier: form.supplier.trim() || null,
      priority: form.priority,
      current_stage_id: firstStage?.id || null,
      entered_current_stage_at: new Date().toISOString(),
      status: 'active',
      created_by: user.id,
    });

    if (error) {
      toast('Failed: ' + error.message, 'error');
    } else {
      toast('Item added to pipeline!', 'success');
      setForm({ name: '', category: '', reference_id: '', purchase_price: '', supplier: '', priority: 'normal' });
      setShowAddForm(false);
      fetchData();
    }
    setSaving(false);
  }

  async function moveToStage(itemId: string, currentStageId: string, newStageId: string) {
    const item = items.find(i => i.id === itemId);
    const daysInPrev = item?.entered_current_stage_at
      ? Math.floor((Date.now() - new Date(item.entered_current_stage_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const { error: transError } = await supabase.from('cycle_transitions').insert({
      organization_id: organization.id,
      item_id: itemId,
      from_stage_id: currentStageId,
      to_stage_id: newStageId,
      days_in_previous_stage: daysInPrev,
      triggered_by: user.id,
    });

    if (transError) { toast('Failed: ' + transError.message, 'error'); return; }

    const { error: moveError } = await supabase.from('cycle_items').update({
      current_stage_id: newStageId,
      entered_current_stage_at: new Date().toISOString(),
    }).eq('id', itemId);

    if (moveError) { toast('Failed: ' + moveError.message, 'error'); return; }

    const newStage = stages.find(s => s.id === newStageId);
    toast(`Moved to ${newStage?.name || 'next stage'}`, 'success');
    fetchData();
  }

  async function markCompleted(itemId: string) {
    const { error } = await supabase.from('cycle_items').update({ status: 'completed' }).eq('id', itemId);
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    toast('Item completed!', 'success');
    fetchData();
  }

  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]';

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>;
  }

  if (!cycleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Set up your business cycle first</h2>
        <Link href="/cycle-setup" className="rounded-xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">Create Business Cycle</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Items" backPath="/dashboard" />
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Pipeline Items</h1>
          <p className="text-xs text-[var(--text-3)]">{items.filter(i => i.status === 'active').length} active &middot; {items.filter(i => i.status === 'completed').length} completed</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ops-radar" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-[var(--text-3)] hover:bg-[var(--bg-2)] transition-colors">Ops Radar</Link>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4338CA] transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={addItem} className="rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5]">New Pipeline Item</h3>
          <input type="text" placeholder="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Reference ID" value={form.reference_id} onChange={(e) => setForm({ ...form, reference_id: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Purchase Price" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
          </div>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Adding...' : 'Add to Pipeline'}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-[var(--text-3)]">Cancel</button>
          </div>
        </form>
      )}

      {stages.map((stage) => {
        const stageItems = items.filter(i => i.current_stage_id === stage.id && i.status === 'active');
        if (stageItems.length === 0) return null;
        const nextStage = stages.find(s => s.stage_order === stage.stage_order + 1);

        return (
          <div key={stage.id}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">{stage.name}</h2>
              <span className="text-[10px] text-[var(--text-4)]">({stageItems.length})</span>
            </div>
            <div className="space-y-1.5">
              {stageItems.map((item) => {
                const daysInStage = item.entered_current_stage_at
                  ? Math.floor((Date.now() - new Date(item.entered_current_stage_at).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-1)] truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.category && <span className="text-[10px] text-[var(--text-4)]">{item.category}</span>}
                          {item.reference_id && <span className="text-[10px] text-[var(--text-4)]">#{item.reference_id}</span>}
                          <span className="text-[10px] text-[var(--text-4)]">{daysInStage}d</span>
                          {item.purchase_price > 0 && <span className="text-[10px] font-mono text-[var(--text-4)]">{formatCurrency(item.purchase_price, currency)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {nextStage ? (
                          <button
                            onClick={() => moveToStage(item.id, stage.id, nextStage.id)}
                            className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors"
                            style={{ backgroundColor: nextStage.color }}
                          >
                            &rarr; {nextStage.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => markCompleted(item.id)}
                            className="rounded-md bg-[#16A34A] px-2.5 py-1.5 text-[10px] font-semibold text-white"
                          >
                            Complete &check;
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {items.filter(i => i.status === 'active').length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">Your pipeline is empty</p>
          <p className="text-[10px] text-[var(--text-4)] mt-1">Add your first item to start tracking</p>
          <button onClick={() => setShowAddForm(true)} className="mt-3 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white">+ Add First Item</button>
        </div>
      )}

      {items.filter(i => i.status === 'completed').length > 0 && (
        <div className="text-center">
          <p className="text-[10px] text-[var(--text-4)]">{items.filter(i => i.status === 'completed').length} completed items</p>
        </div>
      )}
    </div>
  );
}
